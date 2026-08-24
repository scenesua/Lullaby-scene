package com.scene.ambience.media

import com.scene.ambience.data.model.EqSettings
import com.scene.ambience.data.model.MixState
import com.scene.ambience.data.model.PlaybackState
import com.scene.ambience.data.model.SceneMacroState
import com.scene.ambience.data.model.SceneRuntimeSnapshot
import com.scene.ambience.data.model.SourceState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/** Service-owned living-scene runtime. */
class SceneOrchestrator(
    private val engine: AmbienceEngine,
    private val scope: CoroutineScope,
    private val eqSettingsProvider: () -> EqSettings,
    private val isSourceAvailable: (String) -> Boolean,
) {
    private data class HoodCue(
        val atMs: Long,
        val sourceId: String,
        val eventId: String,
        val distance: Float,
        val pan: Float? = null,
    )

    private val _state = MutableStateFlow(SceneRuntimeSnapshot())
    val state: StateFlow<SceneRuntimeSnapshot> = _state.asStateFlow()

    private var job: Job? = null
    private var timeline: AircraftJourneyTimeline? = null
    private var trainTimeline: TrainJourneyTimeline? = null
    private var ambientTimeline: AmbientJourneyTimeline? = null
    private var ambientProfile: AmbientJourneyProfile? = null
    private var hoodEventJob: Job? = null
    private var hoodTrafficJob: Job? = null
    private var hoodLabelJob: Job? = null
    private var scheduleSeed: Long = 0L

    fun start(sceneId: String, totalDurationMinutes: Int): Boolean = when (sceneId) {
        PASSENGER_AIRCRAFT -> startAircraft(totalDurationMinutes)
        TRAIN_JOURNEY -> startTrain(totalDurationMinutes)
        FERRY_JOURNEY, SPACECRAFT_JOURNEY, SUBMARINE_JOURNEY, HOOD_JOURNEY -> startAmbientJourney(sceneId, totalDurationMinutes)
        else -> false
    }

    private fun startAircraft(totalDurationMinutes: Int): Boolean {
        if (!isSourceAvailable(SOURCE_AIRCRAFT)) return false

        clearManualEvents()
        job?.cancel()
        trainTimeline = null
        ambientTimeline = null
        ambientProfile = null
        scheduleSeed = System.currentTimeMillis() xor System.nanoTime()
        val duration = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(totalDurationMinutes)
        timeline = AircraftJourneyTimelineBuilder.build(duration, scheduleSeed)
        _state.value = SceneRuntimeSnapshot(
            sceneId = PASSENGER_AIRCRAFT,
            stateId = STATE_TAXI_OUT,
            totalDurationMinutes = duration,
            elapsedMs = 0L,
            seatbeltSignOn = true,
            macros = SceneMacroState(),
        )

        // Keep the journey path deliberately simple: the verified stereo cabin
        // field recording is the audible bed. Do not layer ventilation, synthetic
        // rumble, widening or other broadband noise over it; those layers made
        // narrow recording tones and codec artefacts much easier to hear.
        engine.applyMix(
            MixState(
                masterVolume = 0.8f,
                masterMuted = false,
                sources = mapOf(
                    SOURCE_AIRCRAFT to SourceState(
                        SOURCE_AIRCRAFT,
                        enabled = true,
                        volume = 0.62f,
                    ),
                ),
            ),
            presetId = null,
        )
        applyFrame()
        engine.play()
        job = scope.launch { runSceneClock() }
        return true
    }

    private fun startTrain(totalDurationMinutes: Int): Boolean {
        if (!TRAIN_SOURCES.all(isSourceAvailable)) return false

        clearManualEvents()
        job?.cancel()
        timeline = null
        ambientTimeline = null
        ambientProfile = null
        val duration = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(totalDurationMinutes)
        trainTimeline = TrainJourneyTimelineBuilder.build(duration)
        _state.value = SceneRuntimeSnapshot(
            sceneId = TRAIN_JOURNEY,
            stateId = STATE_TRAIN_DEPARTURE,
            totalDurationMinutes = duration,
            elapsedMs = 0L,
            seatbeltSignOn = false,
            activeEventId = TrainJourneyTimeline.EVENT_DEPARTURE,
            macros = SceneMacroState(
                enginePresence = 0.58f,
                cabinActivity = 0.24f,
                turbulence = 0.32f,
                nightDepth = 0.78f,
            ),
        )
        engine.applyMix(
            MixState(
                masterVolume = 0.78f,
                sources = mapOf(
                    SOURCE_TRAIN_DEPARTURE to SourceState(SOURCE_TRAIN_DEPARTURE, enabled = true, volume = 0.58f),
                ),
            ),
            presetId = null,
        )
        engine.play()
        job = scope.launch { runSceneClock() }
        return true
    }

    private fun startAmbientJourney(sceneId: String, totalDurationMinutes: Int): Boolean {
        val profile = AMBIENT_PROFILES[sceneId] ?: return false
        if (!profile.requiredSources.all(isSourceAvailable)) return false
        clearManualEvents()
        job?.cancel()
        timeline = null
        trainTimeline = null
        ambientProfile = profile
        val duration = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(totalDurationMinutes)
        ambientTimeline = profile.buildTimeline(duration)
        _state.value = SceneRuntimeSnapshot(
            sceneId = sceneId,
            stateId = profile.phases[0],
            totalDurationMinutes = duration,
            activeEventId = "${sceneId}_departure",
            macros = profile.defaultMacros,
        )
        profile.manualEvents.keys.forEach { engine.setManualEventSource(it, true) }
        val initial = profile.requiredSources.associateWith { sourceId ->
            val volume = when (sourceId) {
                profile.departureSource -> profile.departureVolume
                profile.eventSource -> profile.eventVolume
                in profile.manualEvents -> profile.manualEvents.getValue(sourceId)
                else -> 0f
            }
            SourceState(sourceId, enabled = volume > 0f, volume = volume)
        }
        engine.applyMix(MixState(masterVolume = profile.masterVolume, sources = initial), presetId = null)
        engine.play()
        job = scope.launch { runSceneClock() }
        if (sceneId == HOOD_JOURNEY && _state.value.randomEventsEnabled) startHoodEvents()
        return true
    }

    fun stopScene() {
        clearManualEvents()
        job?.cancel()
        job = null
        engine.stop()
        timeline = null
        trainTimeline = null
        ambientTimeline = null
        ambientProfile = null
        _state.value = SceneRuntimeSnapshot()
        restoreUserEq()
    }

    fun setRandomEventsEnabled(enabled: Boolean) {
        val current = _state.value
        if (!current.active || current.randomEventsEnabled == enabled) return
        _state.value = current.copy(randomEventsEnabled = enabled, activeEventId = null)
        if (current.sceneId == HOOD_JOURNEY) {
            if (enabled) startHoodEvents() else {
                hoodEventJob?.cancel()
                hoodEventJob = null
                hoodTrafficJob?.cancel()
                hoodTrafficJob = null
            }
        }
    }

    fun release() = stopScene()

    fun setDurationMinutes(minutes: Int) {
        val current = _state.value
        if (!current.active) return
        val duration = AircraftJourneyTimelineBuilder.normalizeDurationMinutes(minutes)
        val endMs = when (current.sceneId) {
            PASSENGER_AIRCRAFT -> AircraftJourneyTimelineBuilder.build(duration, scheduleSeed).also { timeline = it }.journeyEndMs
            TRAIN_JOURNEY -> TrainJourneyTimelineBuilder.build(duration).also { trainTimeline = it }.journeyEndMs
            FERRY_JOURNEY, SPACECRAFT_JOURNEY, SUBMARINE_JOURNEY, HOOD_JOURNEY -> ambientProfile?.buildTimeline(duration)?.also { ambientTimeline = it }?.journeyEndMs
            else -> return
        } ?: return
        _state.value = current.copy(
            totalDurationMinutes = duration,
            elapsedMs = current.elapsedMs.coerceAtMost(endMs),
        )
        applyFrame()
    }

    /** Move the living-scene clock without restarting the audio bed. */
    fun seekToElapsedMs(elapsedMs: Long) {
        val current = _state.value
        if (!current.active) return
        val endMs = when (current.sceneId) {
            PASSENGER_AIRCRAFT -> timeline?.journeyEndMs
            TRAIN_JOURNEY -> trainTimeline?.journeyEndMs
            FERRY_JOURNEY, SPACECRAFT_JOURNEY, SUBMARINE_JOURNEY, HOOD_JOURNEY -> ambientTimeline?.journeyEndMs
            else -> null
        } ?: return
        val target = elapsedMs.coerceIn(0L, endMs)
        _state.value = current.copy(elapsedMs = target)
        applyFrame()
        if (target >= endMs) engine.stop()
    }

    fun stepPhase(direction: Int) {
        val current = _state.value
        if (!current.active) return
        val phases = when (current.sceneId) {
            PASSENGER_AIRCRAFT -> timeline?.let { plan -> listOf(
                STATE_TAXI_OUT to 0L,
                STATE_TAKEOFF to plan.taxiOutEndMs,
                STATE_CLIMB to plan.takeoffEndMs,
                STATE_CRUISE to plan.climbEndMs,
                STATE_DESCENT to plan.descentStartMs,
                STATE_APPROACH to plan.approachStartMs,
                STATE_TAXI_IN to plan.touchdownMs,
                STATE_ARRIVED to plan.journeyEndMs,
            ) }
            TRAIN_JOURNEY -> trainTimeline?.let { plan -> listOf(
                STATE_TRAIN_DEPARTURE to 0L,
                STATE_TRAIN_LEAVING_CITY to plan.departureEndMs,
                STATE_TRAIN_NIGHT_RUN to plan.leavingCityEndMs,
                STATE_TRAIN_APPROACH to plan.approachStartMs,
                STATE_TRAIN_ARRIVAL to plan.arrivalStartMs,
                STATE_ARRIVED to plan.journeyEndMs,
            ) }
            FERRY_JOURNEY, SPACECRAFT_JOURNEY, SUBMARINE_JOURNEY, HOOD_JOURNEY -> ambientTimeline?.phaseSteps()
            else -> null
        } ?: return
        val phase = when (current.sceneId) {
            PASSENGER_AIRCRAFT -> timeline?.phaseAt(current.elapsedMs)
            TRAIN_JOURNEY -> trainTimeline?.phaseAt(current.elapsedMs)
            FERRY_JOURNEY, SPACECRAFT_JOURNEY, SUBMARINE_JOURNEY, HOOD_JOURNEY -> ambientTimeline?.phaseAt(current.elapsedMs)
            else -> null
        } ?: return
        val index = phases.indexOfFirst { it.first == phase }.coerceAtLeast(0)
        val targetIndex = (index + if (direction < 0) -1 else 1).coerceIn(0, phases.lastIndex)
        seekToElapsedMs(phases[targetIndex].second)
    }

    fun setMacro(key: String, value: Float) {
        val current = _state.value
        if (!current.active) return
        val v = value.coerceIn(0f, 1f)
        val m = current.macros
        val next = when (key) {
            MACRO_ENGINE_PRESENCE -> m.copy(enginePresence = v)
            MACRO_CABIN_ACTIVITY -> m.copy(cabinActivity = v)
            MACRO_TURBULENCE -> m.copy(turbulence = v)
            MACRO_NIGHT_DEPTH -> m.copy(nightDepth = v)
            else -> return
        }
        _state.value = current.copy(macros = next)
        applyFrame()
    }

    private fun clearManualEvents() {
        hoodEventJob?.cancel()
        hoodEventJob = null
        hoodTrafficJob?.cancel()
        hoodTrafficJob = null
        hoodLabelJob?.cancel()
        hoodLabelJob = null
        ambientProfile?.manualEvents?.keys?.forEach { engine.setManualEventSource(it, false) }
    }

    private fun startHoodEvents() {
        hoodEventJob?.cancel()
        hoodTrafficJob?.cancel()
        val random = Random(System.nanoTime())
        val trafficRandom = Random(System.nanoTime() xor 0x5A17C4E9L)
        hoodEventJob = scope.launch {
            while (isActive && _state.value.sceneId == HOOD_JOURNEY) {
                delay(random.nextLong(180_000L, 480_001L))
                val snapshot = _state.value
                if (!snapshot.randomEventsEnabled || engine.snapshot().playbackState != PlaybackState.PLAYING) continue
                val phase = ambientTimeline?.phaseAt(snapshot.elapsedMs)
                if (phase !in listOf(STATE_HOOD_AFTER_HOURS, STATE_HOOD_DEEP_NIGHT, STATE_HOOD_STREET_STIRRING)) continue
                val incidentChance = 0.26f + 0.18f * snapshot.macros.turbulence
                if (random.nextFloat() < incidentChance) {
                    runHoodIncident(random, snapshot.macros.turbulence)
                } else {
                    val calm = listOf(
                        SOURCE_HOOD_FOOTSTEPS to EVENT_HOOD_FOOTSTEPS,
                        SOURCE_HOOD_CAR_DOOR to EVENT_HOOD_CAR_DOOR,
                        SOURCE_HOOD_DOG to EVENT_HOOD_DOG,
                        SOURCE_HOOD_HELICOPTER to EVENT_HOOD_HELICOPTER,
                        SOURCE_HOOD_GLASS to EVENT_HOOD_GLASS,
                    ).random(random)
                    triggerHoodEvent(calm.first, calm.second, random.nextFloat() * .75f + .25f, random)
                }
            }
        }
        hoodTrafficJob = scope.launch {
            delay(trafficRandom.nextLong(45_000L, 120_001L))
            while (isActive && _state.value.sceneId == HOOD_JOURNEY) {
                val snapshot = _state.value
                val phase = ambientTimeline?.phaseAt(snapshot.elapsedMs)
                if (snapshot.randomEventsEnabled && engine.snapshot().playbackState == PlaybackState.PLAYING && phase in listOf(STATE_HOOD_AFTER_HOURS, STATE_HOOD_DEEP_NIGHT, STATE_HOOD_STREET_STIRRING)) {
                    triggerHoodEvent(SOURCE_HOOD_CAR_PASS, EVENT_HOOD_CAR_PASS, trafficRandom.nextFloat() * .76f + .12f, trafficRandom)
                }
                delay(trafficRandom.nextLong(75_000L, 260_001L))
            }
        }
    }

    private suspend fun runHoodIncident(random: Random, intensity: Float) {
        val durationMs = random.nextLong(10_000L, 45_001L)
        val leftDistance = random.nextFloat() * .36f + .58f
        val rightDistance = random.nextFloat() * .38f + .58f
        val leftPan = -(random.nextFloat() * .48f + .30f)
        val rightPan = random.nextFloat() * .48f + .30f
        val cues = mutableListOf<HoodCue>()
        var elapsedMs = random.nextLong(80L, 501L)
        var volley = 0
        while (elapsedMs < durationMs - 900L) {
            val leftSide = volley++ % 2 == 0
            val distance = if (leftSide) leftDistance else rightDistance
            val pan = if (leftSide) leftPan else rightPan
            val maxShots = if (intensity > .72f) 4 else 3
            repeat(random.nextInt(1, maxShots + 1)) {
                if (elapsedMs >= durationMs - 350L) return@repeat
                cues += HoodCue(elapsedMs, SOURCE_HOOD_GUNSHOT, EVENT_HOOD_GUNSHOT, (distance + random.nextFloat() * .12f - .04f).coerceIn(.58f, 1f), (pan + random.nextFloat() * .24f - .12f).coerceIn(-1f, 1f))
                elapsedMs += random.nextLong(170L, 521L)
            }
            if (random.nextFloat() < .60f) {
                cues += HoodCue((elapsedMs + random.nextLong(120L, 851L)).coerceAtMost(durationMs - 250L), SOURCE_HOOD_SHOUT, EVENT_HOOD_SHOUT, random.nextFloat() * .38f + .62f, random.nextFloat() * 1.44f - .72f)
            }
            elapsedMs += random.nextLong(900L, 3_801L)
        }
        if (random.nextFloat() < .52f) {
            cues += HoodCue(random.nextLong(1_000L, (durationMs - 399L).coerceAtLeast(1_101L)), SOURCE_HOOD_GLASS, EVENT_HOOD_GLASS, random.nextFloat() * .38f + .62f, random.nextFloat() * 1.52f - .76f)
        }
        repeat(random.nextInt(1, 4)) {
            cues += HoodCue(random.nextLong(18_000L, 115_001L), SOURCE_HOOD_SIREN, EVENT_HOOD_SIREN, random.nextFloat() * .58f + .10f)
        }
        var previousMs = 0L
        for (cue in cues.sortedBy { it.atMs }) {
            delay((cue.atMs - previousMs).coerceAtLeast(0L))
            triggerHoodEvent(cue.sourceId, cue.eventId, cue.distance, random, cue.pan)
            previousMs = cue.atMs
        }
    }

    private fun triggerHoodEvent(sourceId: String, eventId: String, distance: Float, random: Random, pan: Float? = null) {
        if (_state.value.sceneId != HOOD_JOURNEY || !_state.value.randomEventsEnabled) return
        val minimumDistance = if (sourceId in listOf(SOURCE_HOOD_GUNSHOT, SOURCE_HOOD_SHOUT, SOURCE_HOOD_GLASS)) .58f else 0f
        val close = 1f - distance.coerceIn(minimumDistance, 1f)
        val scale = when (sourceId) {
            SOURCE_HOOD_GUNSHOT -> .42f + close * .40f
            SOURCE_HOOD_SHOUT -> .42f + close * .36f
            SOURCE_HOOD_SIREN -> 1.08f + close * .42f
            else -> .55f + close * .65f
        }
        if (engine.triggerEventNow(sourceId, scale, pan ?: (random.nextFloat() * 1.7f - .85f))) {
            _state.value = _state.value.copy(activeEventId = eventId)
            hoodLabelJob?.cancel()
            hoodLabelJob = scope.launch {
                delay(if (sourceId == SOURCE_HOOD_SIREN) 12_000L else 4_000L)
                if (_state.value.activeEventId == eventId) _state.value = _state.value.copy(activeEventId = null)
            }
        }
    }

    private suspend fun runSceneClock() {
        while (kotlin.coroutines.coroutineContext.isActive && _state.value.active) {
            delay(TICK_MS)
            if (engine.snapshot().playbackState != PlaybackState.PLAYING) continue
            val endMs = when (_state.value.sceneId) {
                PASSENGER_AIRCRAFT -> timeline?.journeyEndMs
                TRAIN_JOURNEY -> trainTimeline?.journeyEndMs
                FERRY_JOURNEY, SPACECRAFT_JOURNEY, SUBMARINE_JOURNEY, HOOD_JOURNEY -> ambientTimeline?.journeyEndMs
                else -> null
            } ?: return
            val current = _state.value
            val elapsed = (current.elapsedMs + TICK_MS).coerceAtMost(endMs)
            _state.value = current.copy(elapsedMs = elapsed)
            applyFrame()
            if (elapsed >= endMs) {
                engine.stop()
                return
            }
        }
    }

    private fun applyFrame() {
        val current = _state.value
        when (current.sceneId) {
            PASSENGER_AIRCRAFT -> applyAircraftFrame(current)
            TRAIN_JOURNEY -> applyTrainFrame(current)
            FERRY_JOURNEY, SPACECRAFT_JOURNEY, SUBMARINE_JOURNEY, HOOD_JOURNEY -> applyAmbientFrame(current)
        }
    }

    private fun applyAircraftFrame(current: SceneRuntimeSnapshot) {
        val plan = timeline ?: return
        val phase = plan.phaseAt(current.elapsedMs)
        val activeEvent = if (current.randomEventsEnabled) plan.activeEventsAt(current.elapsedMs).firstOrNull() else null
        val beltOn = plan.seatbeltSignOnAt(current.elapsedMs)
        val frame = passengerAircraftFrame(current, phase, activeEvent)

        if (phase != current.stateId || beltOn != current.seatbeltSignOn || activeEvent?.kind != current.activeEventId) {
            _state.value = current.copy(
                stateId = phase,
                seatbeltSignOn = beltOn,
                activeEventId = activeEvent?.kind,
            )
        }

        setVolumeIfChanged(SOURCE_AIRCRAFT, frame.aircraftVolume)
        applySceneDsp(current.macros, phase, activeEvent)
    }

    private fun applyTrainFrame(current: SceneRuntimeSnapshot) {
        val plan = trainTimeline ?: return
        val phase = plan.phaseAt(current.elapsedMs)
        val event = if (current.randomEventsEnabled) plan.activeEventAt(current.elapsedMs) else null
        if (phase != current.stateId || event != current.activeEventId) {
            _state.value = current.copy(stateId = phase, activeEventId = event)
        }

        val m = current.macros
        val rhythm = 0.46f + 0.18f * m.enginePresence
        val carriage = 0.96f + 0.06f * m.cabinActivity
        val texture = 0.96f + 0.05f * m.turbulence
        val night = 1f - 0.10f * m.nightDepth
        val bedVolume = (rhythm * carriage * texture * night).coerceIn(0.30f, 0.68f)
        val departureFade = journeyCrossfade(current.elapsedMs, plan.departureEndMs)
        val arrivalFade = journeyCrossfade(current.elapsedMs, plan.arrivalStartMs)
        setVolumeIfChanged(SOURCE_TRAIN_DEPARTURE, 0.58f * departureFade.first)
        setVolumeIfChanged(
            SOURCE_TRAIN_BED,
            bedVolume * departureFade.second * arrivalFade.first,
        )
        setVolumeIfChanged(SOURCE_TRAIN_ARRIVAL, 0.56f * arrivalFade.second)
    }

    private fun applyAmbientFrame(current: SceneRuntimeSnapshot) {
        val plan = ambientTimeline ?: return
        val profile = ambientProfile ?: return
        val phase = plan.phaseAt(current.elapsedMs)
        val event = when {
            !current.randomEventsEnabled -> null
            current.sceneId == HOOD_JOURNEY && current.activeEventId?.startsWith("hood_event_") == true -> current.activeEventId
            phase == profile.phases[0] -> "${profile.sceneId}_departure"
            phase == profile.phases[4] -> "${profile.sceneId}_arrival"
            phase == profile.phases[2] -> profile.eventSource
            else -> null
        }
        if (phase != current.stateId || event != current.activeEventId) {
            _state.value = current.copy(stateId = phase, activeEventId = event)
        }

        val m = current.macros
        val presence = 0.88f + 0.18f * m.enginePresence
        val activity = 0.96f + 0.05f * m.cabinActivity
        val texture = 0.96f + 0.04f * m.turbulence
        val night = 1f - 0.08f * m.nightDepth
        val desired = profile.requiredSources.associateWith { 0f }.toMutableMap()
        val departureFade = journeyCrossfade(current.elapsedMs, plan.departureEndMs)
        val arrivalFade = journeyCrossfade(current.elapsedMs, plan.arrivalStartMs)
        desired[profile.departureSource] = maxOf(desired[profile.departureSource] ?: 0f, profile.departureVolume * departureFade.first)
        profile.bedSources.forEach { (source, base) ->
            desired[source] = maxOf(desired[source] ?: 0f, (base * presence * activity * texture * night).coerceIn(0.18f, 0.68f) * departureFade.second * arrivalFade.first)
        }
        desired[profile.arrivalSource] = maxOf(desired[profile.arrivalSource] ?: 0f, profile.arrivalVolume * arrivalFade.second)
        profile.eventSource?.let {
            desired[it] = if (current.randomEventsEnabled) {
                (profile.eventVolume * (0.65f + 0.35f * m.cabinActivity) * night).coerceAtLeast(0.03f)
            } else {
                0f
            }
        }
        profile.manualEvents.forEach { (source, base) -> desired[source] = base * (0.72f + 0.42f * m.cabinActivity) }
        desired.forEach(::setVolumeIfChanged)
    }

    private fun setVolumeIfChanged(sourceId: String, volume: Float) {
        val current = engine.snapshot().sources[sourceId]?.volume ?: -1f
        if (kotlin.math.abs(current - volume) >= 0.006f) {
            engine.setSourceVolume(sourceId, volume.coerceIn(0f, 1f))
        }
    }

    /**
     * Keep phase tone changes intentionally tiny. The processed source already
     * removes the two persistent whistle bands, so scene DSP must not try to
     * manufacture a different cabin with strong EQ, modulation or widening.
     */
    private fun applySceneDsp(
        macros: SceneMacroState,
        phase: String,
        event: AircraftJourneyEvent?,
    ) {
        val user = eqSettingsProvider()
        val count = maxOf(5, user.bands.size)
        val bands = MutableList(count) { index -> if (user.enabled) user.bands.getOrElse(index) { 0 } else 0 }
        val phasePresence = when (phase) {
            STATE_TAKEOFF -> 1f
            STATE_CLIMB -> 0.55f
            STATE_DESCENT -> 0.20f
            STATE_APPROACH -> 0.25f
            else -> 0f
        }
        val turbulence = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_TURBULENCE) event.intensity else 0f
        val lowBody = (28f * phasePresence + 16f * turbulence * macros.turbulence).toInt()
        val highSoftening = (80f * macros.nightDepth + 35f * (1f - macros.enginePresence)).toInt()
        // Persistent aircraft whistle suppression is source-aware in AmbienceEngine.
        // Keep the scene scheduler limited to the very small user-controlled tone
        // changes so it does not double-cut the cabin recording.
        bands[0] = (bands[0] + lowBody).coerceIn(-1500, 1500)
        if (count >= 2) bands[count - 2] = (bands[count - 2] - highSoftening / 2).coerceIn(-1500, 1500)
        bands[count - 1] = (bands[count - 1] - highSoftening).coerceIn(-1500, 1500)
        engine.applyEqualizer(user.enabled || lowBody != 0 || highSoftening != 0, "scene_aircraft_tone", bands)
    }

    private fun restoreUserEq() {
        val user = eqSettingsProvider()
        engine.applyEqualizer(user.enabled, user.presetName, user.bands)
    }

    private data class AircraftFrame(val aircraftVolume: Float)

    private data class AmbientJourneyProfile(
        val sceneId: String,
        val departureSource: String,
        val bedSources: Map<String, Float>,
        val arrivalSource: String,
        val eventSource: String? = null,
        val manualEvents: Map<String, Float> = emptyMap(),
        val phases: List<String>,
        val departureMs: Long,
        val arrivalMs: Long,
        val settleMinutes: Int = 10,
        val approachMinutes: Int = 10,
        val masterVolume: Float = 0.78f,
        val departureVolume: Float = 0.54f,
        val arrivalVolume: Float = 0.52f,
        val eventVolume: Float = 0.10f,
        val defaultMacros: SceneMacroState = SceneMacroState(),
    ) {
        val requiredSources: List<String> = (listOf(departureSource, arrivalSource) + bedSources.keys + listOfNotNull(eventSource) + manualEvents.keys).distinct()

        fun buildTimeline(minutes: Int) = AmbientJourneyTimelineBuilder.build(
            totalDurationMinutes = minutes,
            departureMs = departureMs,
            arrivalMs = arrivalMs,
            phases = phases,
            settleMinutes = settleMinutes,
            approachMinutes = approachMinutes,
        )
    }

    private fun passengerAircraftFrame(
        snapshot: SceneRuntimeSnapshot,
        phase: String,
        event: AircraftJourneyEvent?,
    ): AircraftFrame {
        val phaseDetail = when (phase) {
            STATE_TAXI_OUT -> 0.94f
            STATE_TAKEOFF -> 1.04f
            STATE_CLIMB -> 1.02f
            STATE_CRUISE -> 1.00f
            STATE_DESCENT -> 0.99f
            STATE_APPROACH -> 1.01f
            STATE_TAXI_IN -> 0.92f
            else -> 0.70f
        }
        val m = snapshot.macros
        val eventTurbulence = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_TURBULENCE) event.intensity else 0f
        val eventCabin = if (event?.kind == AircraftJourneyTimelineBuilder.EVENT_CABIN_ACTIVITY) event.intensity else 0f
        val effectiveCabin = (m.cabinActivity + eventCabin).coerceIn(0f, 1f)
        val presence = 0.94f + 0.06f * m.enginePresence
        val detail = 0.98f + 0.03f * effectiveCabin
        val turbulenceLevel = 1f + 0.008f * (m.turbulence + eventTurbulence).coerceIn(0f, 1f)
        val aircraft = (0.62f * phaseDetail * presence * detail * turbulenceLevel).coerceIn(0.30f, 0.72f)
        return AircraftFrame(aircraft)
    }

    companion object {
        const val PASSENGER_AIRCRAFT = "passenger_aircraft_cabin"
        const val TRAIN_JOURNEY = "train_journey"
        const val FERRY_JOURNEY = "ferry_journey"
        const val SPACECRAFT_JOURNEY = "spacecraft_journey"
        const val SUBMARINE_JOURNEY = "submarine_journey"
        const val HOOD_JOURNEY = "hood_journey"
        const val SOURCE_AIRCRAFT = "aircraft_cabin"
        const val SOURCE_VENTILATION = "ventilation" // kept for recipe/protocol compatibility
        const val SOURCE_TRAIN_DEPARTURE = "train_journey_departure"
        const val SOURCE_TRAIN_BED = "train_journey_bed"
        const val SOURCE_TRAIN_ARRIVAL = "train_journey_arrival"
        val TRAIN_SOURCES = listOf(SOURCE_TRAIN_DEPARTURE, SOURCE_TRAIN_BED, SOURCE_TRAIN_ARRIVAL)
        const val SOURCE_FERRY_DEPARTURE = "ferry_journey_departure"
        const val SOURCE_FERRY_BED = "ferry_journey_bed"
        const val SOURCE_FERRY_ARRIVAL = "ferry_journey_arrival"
        const val SOURCE_SPACECRAFT_TRANSITION = "spacecraft_journey_transition"
        const val SOURCE_SPACECRAFT_BED = "spacecraft_journey_bed"
        const val SOURCE_SUBMARINE_DEPARTURE = "submarine_journey_departure"
        const val SOURCE_SUBMARINE_ENGINE = "submarine_journey_engine_bed"
        const val SOURCE_SUBMARINE_WATER = "submarine_journey_water_bed"
        const val SOURCE_SUBMARINE_ARRIVAL = "submarine_journey_arrival"
        const val SOURCE_SUBMARINE_SONAR = "submarine_sonar"
        const val SOURCE_HOOD_BED = "hood_journey_bed"
        const val SOURCE_HOOD_GUNSHOT = "hood_gunshot"
        const val SOURCE_HOOD_SIREN = "hood_siren"
        const val SOURCE_HOOD_GLASS = "hood_glass"
        const val SOURCE_HOOD_SHOUT = "hood_shout"
        const val SOURCE_HOOD_FOOTSTEPS = "hood_footsteps"
        const val SOURCE_HOOD_CAR_PASS = "hood_car_pass"
        const val SOURCE_HOOD_CAR_DOOR = "hood_car_door"
        const val SOURCE_HOOD_HELICOPTER = "hood_helicopter"
        const val SOURCE_HOOD_DOG = "hood_dog"

        const val MACRO_ENGINE_PRESENCE = "engine_presence"
        const val MACRO_CABIN_ACTIVITY = "cabin_activity"
        const val MACRO_TURBULENCE = "turbulence"
        const val MACRO_NIGHT_DEPTH = "night_depth"

        const val STATE_TAXI_OUT = "taxi_out"
        const val STATE_TAKEOFF = "takeoff"
        const val STATE_CLIMB = "climb"
        const val STATE_CRUISE = "cruise"
        const val STATE_DESCENT = "descent"
        const val STATE_APPROACH = "approach"
        const val STATE_TAXI_IN = "taxi_in"
        const val STATE_TRAIN_DEPARTURE = "train_departure"
        const val STATE_TRAIN_LEAVING_CITY = "train_leaving_city"
        const val STATE_TRAIN_NIGHT_RUN = "train_night_run"
        const val STATE_TRAIN_APPROACH = "train_approach"
        const val STATE_TRAIN_ARRIVAL = "train_arrival"
        const val STATE_FERRY_CAST_OFF = "ferry_cast_off"
        const val STATE_FERRY_LEAVING_HARBOR = "ferry_leaving_harbor"
        const val STATE_FERRY_NIGHT_CROSSING = "ferry_night_crossing"
        const val STATE_FERRY_HARBOR_APPROACH = "ferry_harbor_approach"
        const val STATE_FERRY_ARRIVAL = "ferry_arrival"
        const val STATE_SPACECRAFT_DEPARTURE = "spacecraft_departure"
        const val STATE_SPACECRAFT_ORBITAL_SETTLE = "spacecraft_orbital_settle"
        const val STATE_SPACECRAFT_DEEP_DRIFT = "spacecraft_deep_drift"
        const val STATE_SPACECRAFT_APPROACH = "spacecraft_approach"
        const val STATE_SPACECRAFT_DOCKING = "spacecraft_docking"
        const val STATE_SUBMARINE_DIVE = "submarine_dive"
        const val STATE_SUBMARINE_SETTLE = "submarine_settle"
        const val STATE_SUBMARINE_DEEP_CRUISE = "submarine_deep_cruise"
        const val STATE_SUBMARINE_ASCENT = "submarine_ascent"
        const val STATE_SUBMARINE_SURFACE = "submarine_surface"
        const val STATE_HOOD_SETTLING = "hood_settling"
        const val STATE_HOOD_AFTER_HOURS = "hood_after_hours"
        const val STATE_HOOD_DEEP_NIGHT = "hood_deep_night"
        const val STATE_HOOD_STREET_STIRRING = "hood_street_stirring"
        const val STATE_HOOD_FIRST_LIGHT = "hood_first_light"
        const val EVENT_HOOD_GUNSHOT = "hood_event_gunshot"
        const val EVENT_HOOD_SIREN = "hood_event_siren"
        const val EVENT_HOOD_GLASS = "hood_event_glass"
        const val EVENT_HOOD_SHOUT = "hood_event_shout"
        const val EVENT_HOOD_FOOTSTEPS = "hood_event_footsteps"
        const val EVENT_HOOD_CAR_PASS = "hood_event_car_pass"
        const val EVENT_HOOD_CAR_DOOR = "hood_event_car_door"
        const val EVENT_HOOD_HELICOPTER = "hood_event_helicopter"
        const val EVENT_HOOD_DOG = "hood_event_dog"
        const val STATE_ARRIVED = "arrived"

        private val AMBIENT_PROFILES = listOf(
            AmbientJourneyProfile(
                sceneId = FERRY_JOURNEY,
                departureSource = SOURCE_FERRY_DEPARTURE,
                bedSources = mapOf(SOURCE_FERRY_BED to 0.48f),
                arrivalSource = SOURCE_FERRY_ARRIVAL,
                phases = listOf(STATE_FERRY_CAST_OFF, STATE_FERRY_LEAVING_HARBOR, STATE_FERRY_NIGHT_CROSSING, STATE_FERRY_HARBOR_APPROACH, STATE_FERRY_ARRIVAL),
                departureMs = 128_667L,
                arrivalMs = 98_065L,
                settleMinutes = 12,
                approachMinutes = 12,
                defaultMacros = SceneMacroState(enginePresence = .56f, cabinActivity = .18f, turbulence = .30f, nightDepth = .80f),
            ),
            AmbientJourneyProfile(
                sceneId = SPACECRAFT_JOURNEY,
                departureSource = SOURCE_SPACECRAFT_TRANSITION,
                bedSources = mapOf(SOURCE_SPACECRAFT_BED to 0.48f),
                arrivalSource = SOURCE_SPACECRAFT_TRANSITION,
                phases = listOf(STATE_SPACECRAFT_DEPARTURE, STATE_SPACECRAFT_ORBITAL_SETTLE, STATE_SPACECRAFT_DEEP_DRIFT, STATE_SPACECRAFT_APPROACH, STATE_SPACECRAFT_DOCKING),
                departureMs = 17_824L,
                arrivalMs = 17_824L,
                defaultMacros = SceneMacroState(enginePresence = .48f, cabinActivity = .12f, turbulence = .20f, nightDepth = .88f),
            ),
            AmbientJourneyProfile(
                sceneId = SUBMARINE_JOURNEY,
                departureSource = SOURCE_SUBMARINE_DEPARTURE,
                bedSources = mapOf(SOURCE_SUBMARINE_ENGINE to .43f, SOURCE_SUBMARINE_WATER to .24f),
                arrivalSource = SOURCE_SUBMARINE_ARRIVAL,
                eventSource = SOURCE_SUBMARINE_SONAR,
                phases = listOf(STATE_SUBMARINE_DIVE, STATE_SUBMARINE_SETTLE, STATE_SUBMARINE_DEEP_CRUISE, STATE_SUBMARINE_ASCENT, STATE_SUBMARINE_SURFACE),
                departureMs = 47_282L,
                arrivalMs = 54_232L,
                settleMinutes = 8,
                approachMinutes = 8,
                eventVolume = .08f,
                defaultMacros = SceneMacroState(enginePresence = .50f, cabinActivity = .10f, turbulence = .28f, nightDepth = .90f),
            ),
            AmbientJourneyProfile(
                sceneId = HOOD_JOURNEY,
                departureSource = SOURCE_HOOD_BED,
                bedSources = mapOf(SOURCE_HOOD_BED to .52f),
                arrivalSource = SOURCE_HOOD_BED,
                manualEvents = mapOf(
                    SOURCE_HOOD_GUNSHOT to .28f,
                    SOURCE_HOOD_SIREN to .34f,
                    SOURCE_HOOD_GLASS to .20f,
                    SOURCE_HOOD_SHOUT to .18f,
                    SOURCE_HOOD_FOOTSTEPS to .14f,
                    SOURCE_HOOD_CAR_PASS to .18f,
                    SOURCE_HOOD_CAR_DOOR to .16f,
                    SOURCE_HOOD_HELICOPTER to .14f,
                    SOURCE_HOOD_DOG to .14f,
                ),
                phases = listOf(STATE_HOOD_SETTLING, STATE_HOOD_AFTER_HOURS, STATE_HOOD_DEEP_NIGHT, STATE_HOOD_STREET_STIRRING, STATE_HOOD_FIRST_LIGHT),
                departureMs = 45_000L,
                arrivalMs = 45_000L,
                settleMinutes = 10,
                approachMinutes = 10,
                masterVolume = .80f,
                departureVolume = .48f,
                arrivalVolume = .42f,
                defaultMacros = SceneMacroState(enginePresence = .58f, cabinActivity = .46f, turbulence = .55f, nightDepth = .72f),
            ),
        ).associateBy { it.sceneId }

        fun requiredSourcesFor(sceneId: String): List<String> = when (sceneId) {
            PASSENGER_AIRCRAFT -> listOf(SOURCE_AIRCRAFT)
            TRAIN_JOURNEY -> TRAIN_SOURCES
            else -> AMBIENT_PROFILES[sceneId]?.requiredSources.orEmpty()
        }

        private const val TICK_MS = 1_000L
        internal const val JOURNEY_CROSSFADE_MS = 8_000L
    }
}

internal fun journeyCrossfade(
    elapsedMs: Long,
    boundaryMs: Long,
    fadeMs: Long = SceneOrchestrator.JOURNEY_CROSSFADE_MS,
): Pair<Float, Float> {
    val progress = ((elapsedMs - (boundaryMs - fadeMs)).toFloat() / fadeMs).coerceIn(0f, 1f)
    if (progress == 0f) return 1f to 0f
    if (progress == 1f) return 0f to 1f
    val angle = progress * (Math.PI.toFloat() / 2f)
    return cos(angle) to sin(angle)
}
