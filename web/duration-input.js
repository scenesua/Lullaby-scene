(()=>{
  const MIN_MINUTES=240;
  const MAX_MINUTES=720;
  const control=document.querySelector('.duration-control');
  const slider=document.getElementById('durationSlider');
  if(!control||!slider||typeof window.setDuration!=='function')return;

  const row=document.createElement('div');
  row.className='duration-direct';
  row.innerHTML=`
    <div class="duration-direct-copy">
      <strong>직접 입력</strong>
      <span>HH:MM · 04:00~12:00</span>
    </div>
    <div class="duration-direct-entry">
      <input id="durationDirect" type="text" inputmode="numeric" autocomplete="off" maxlength="5" value="08:00" placeholder="08:00" aria-label="전체 여정 시간 직접 입력 HH:MM">
      <button id="durationDirectApply" type="button">적용</button>
    </div>
    <p id="durationDirectError" class="duration-direct-error" role="alert" hidden></p>`;
  control.appendChild(row);

  const input=document.getElementById('durationDirect');
  const button=document.getElementById('durationDirectApply');
  const error=document.getElementById('durationDirectError');

  function minutesToHHMM(minutes){
    const total=Math.round(Number(minutes)||0);
    const h=Math.floor(total/60);
    const m=total%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function sync(){input.value=minutesToHHMM(slider.value)}

  function parse(value){
    const match=/^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
    if(!match)return null;
    const minutes=Number(match[1])*60+Number(match[2]);
    if(minutes<MIN_MINUTES||minutes>MAX_MINUTES)return null;
    return minutes;
  }

  function apply(){
    const minutes=parse(input.value);
    if(minutes===null){
      error.textContent='04:00~12:00 사이의 HH:MM 형식으로 입력해 주세요. 예: 08:30';
      error.hidden=false;
      input.setAttribute('aria-invalid','true');
      return;
    }
    error.hidden=true;
    input.removeAttribute('aria-invalid');
    window.setDuration(minutes);
    input.value=minutesToHHMM(minutes);
  }

  input.addEventListener('input',()=>{
    const digits=input.value.replace(/\D/g,'').slice(0,4);
    if(digits.length>=3)input.value=`${digits.slice(0,-2)}:${digits.slice(-2)}`;
    else input.value=digits;
    error.hidden=true;
    input.removeAttribute('aria-invalid');
  });
  input.addEventListener('keydown',e=>{if(e.key==='Enter')apply()});
  input.addEventListener('blur',()=>{if(parse(input.value)!==null)input.value=minutesToHHMM(parse(input.value))});
  button.addEventListener('click',apply);
  slider.addEventListener('input',sync);
  document.querySelectorAll('[data-duration]').forEach(b=>b.addEventListener('click',()=>queueMicrotask(sync)));
  sync();
})();
