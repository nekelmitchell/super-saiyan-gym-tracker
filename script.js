/*
  Single-file SPA implementing the workout flow described by the user.
  - State is kept in `state` object
  - Calendar/workout logs saved in localStorage under key 'ss_workouts_calendar'
*/

const state = {
  selectedPart: null,
  exercisesByPart: {
    leg: ["Squat","Lunge","Leg Press","Hamstring Curl","Glute Bridge"],
    back: ["Pull Ups","Dumbbell Row","Lat Pulldown","Bicep Curl","Face Pull"],
    chest: ["Bench Press","Push Ups","Dumbbell Fly","Incline DB Press","Shoulder Press"],
    abs: ["Plank","Crunch","Bicycle Crunch","Mountain Climbers","Jump Rope"]
  },
  pickedExercises: [],
  timers: {
    warmup: 0,
    dynamic: 0,
    cardio: 0,
    workout: 0
  },
  currentTimer: null,
  liftingData: {}, // {exercise: {sets, reps, untilFailure}}
  calendarKey: 'ss_workouts_calendar',
  workoutStartTs: null,
};

const content = document.getElementById('content');
const menuBtns = document.querySelectorAll('.menu-btn');
const charImg = document.getElementById('characterImg');
const charStatus = document.getElementById('characterStatus');
const sessionInfo = document.getElementById('sessionInfo');
const viewCalendarBtn = document.getElementById('viewCalendarBtn');

function setActiveMenu(partBtn){
  menuBtns.forEach(b=>b.classList.remove('active'));
  if(partBtn) partBtn.classList.add('active');
}

document.getElementById('startBtn').addEventListener('click', ()=>{ alert('Pick a body part from the left menu to begin.')});
document.getElementById('quickStartBtn').addEventListener('click', ()=>{
  const b = document.querySelector('.menu-btn[data-part="leg"]');
  b && b.click();
});

menuBtns.forEach(btn=>{
  const part = btn.dataset.part;
  if(part){
    btn.addEventListener('click', ()=>{
      state.selectedPart = part;
      setActiveMenu(btn);
      renderExercisePicker(part);
    })
  }
})

viewCalendarBtn.addEventListener('click', ()=>{ renderCalendarView(); });

/* Utilities */
function el(html){ const d=document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
function formatTimeSec(s){
  const mm = Math.floor(s/60).toString().padStart(2,'0');
  const ss = Math.floor(s%60).toString().padStart(2,'0');
  return mm + ":" + ss;
}
function saveCalendar(data){
  localStorage.setItem(state.calendarKey, JSON.stringify(data));
}


function loadCalendar(){
  const raw = localStorage.getItem(state.calendarKey);
  return raw ? JSON.parse(raw) : {};
}


let currentWorkoutCategory = 0;


function startWorkout(category) {
  currentWorkoutCategory = category;
  showWorkoutScreen();
}

startWorkout("Leg / Glute");
startWorkout("Back / Arm");
startWorkout("Chest / Shoulders");
startWorkout("Abs / Cardio");

function markCharacterSuper() {
    charImg.classList.remove('char-normal'); charImg.classList.add('char-super');

  switch (currentWorkoutCategory) {
    case "Leg / Glute":
      charImg.src = "saiyanblue.jpg";
      charStatus.textContent = 'Character: Super Saiyan (Go!)';
      break;
    case "Back / Arm":
      charImg.src = "saiyanblue.jpg";
      charStatus.textContent = 'Character: Super Saiyan (Go!)';
      break;
    case "Chest / Shoulder":
      charImg.src = "saiyanblue.jpg";
      charStatus.textContent = 'Character: Super Saiyan (Go!)';
      break;
    case "Abs / Calendar":
      charImg.src = "saiyanblue.jpg";
      charStatus.textContent = 'Character: Super Saiyan (Go!)';
      break;
      default:
      charImg.src = "gymbackground.jpg"; // fallback
  }
}

function markCharacterNormal() {
    charImg.classList.remove('char-super'); charImg.classList.add('char-normal');
    charStatus.textContent = 'Character: Normal';
    charImg.src = "gymbackground.jpg";

}

/* Renderers */

function renderExercisePicker(part){
  // page: check-box list of lifts, Ready To Start button
  const list = state.exercisesByPart[part] || [];
  const html = `
    <h1>${partName(part)} - Select Exercises</h1>
    <p>Check the exercises you want to include in this workout. Then click <strong>Ready To Start</strong>.</p>
    <div class="check-list" id="exerciseList"></div>
    <div class="controls">
      <button class="btn" id="readyStart">Ready To Start</button>
      <button class="btn secondary" id="backToHome">Back</button>
    </div>
  `;
  content.innerHTML = html;
  const exList = document.getElementById('exerciseList');
  list.forEach(ex => {
    const id = 'chk_'+ex.replace(/\s+/g,'_');
    const node = el(`<label><input type="checkbox" id="${id}" value="${ex}"> ${ex}</label>`);
    exList.appendChild(node);
  });

  document.getElementById('readyStart').addEventListener('click', ()=>{
    const checked = Array.from(exList.querySelectorAll('input[type=checkbox]:checked')).map(i=>i.value);
    if(checked.length===0){ alert('Pick at least one exercise to continue.'); return; }
    state.pickedExercises = checked;
    // prepare liftingData
    state.liftingData = {};
    checked.forEach(e=> state.liftingData[e] = {sets:'', reps:'', untilFailure:false});
    askWarmup();
  });

  document.getElementById('backToHome').addEventListener('click', ()=> { renderHome(); setActiveMenu(null); });
  sessionInfo.textContent = `Selected: ${partName(part)}`;
}


function partName(key){
  return {
    leg: 'Leg / Glute',
    back: 'Back / Arm',
    chest: 'Chest / Shoulder',
    abs: 'Abs / Cardio'
  }[key] || key;
}

function askWarmup(){
  // Ask Warmup? Yes/No
  content.innerHTML = `
    <h1>Warmup?</h1>
    <p>Would you like to do a warmup before lifting?</p>
    <div class="controls">
      <button class="btn" id="warmYes">Yes</button>
      <button class="btn secondary" id="warmNo">No</button>
    </div>
  `;
  document.getElementById('warmYes').addEventListener('click', ()=> chooseWarmupOption(true));
  document.getElementById('warmNo').addEventListener('click', ()=> chooseWarmupOption(false));
}

function chooseWarmupOption(yes){
  if(yes){
    // provide 4 options: Walking, Bicycle, Running, Stairmaster
    content.innerHTML = `
      <h1>Warmup Options</h1>
      <p>Pick one warmup option</p>
      <div class="controls">
        <button class="btn warm" data-warm="Walking">Walking</button>
        <button class="btn warm" data-warm="Bicycle">Bicycle</button>
        <button class="btn warm" data-warm="Running">Running</button>
        <button class="btn warm" data-warm="Stairmaster">Stairmaster</button>
      </div>
      <div style="margin-top:12px">
        <label>Warmup duration (minutes):
          <input type="number" id="warmMinutes" min="1" value="5">
        </label>
        <div style="margin-top:8px">
          <button class="btn" id="startWarm">Start Warmup</button>
          <button class="btn secondary" id="skipWarm">Skip</button>
        </div>
      </div>
    `;
    document.querySelectorAll('.warm').forEach(b=>{
      b.addEventListener('click', (ev)=> {
        document.querySelectorAll('.warm').forEach(x=>x.classList.remove('active'));
        ev.currentTarget.classList.add('active');
        content.dataset.warm = ev.currentTarget.dataset.warm;
      });
    });
    document.getElementById('startWarm').addEventListener('click', ()=>{
      const minutes = parseFloat(document.getElementById('warmMinutes').value)||0;
      if(minutes<=0){ alert('Enter a positive time'); return; }
      const warmType = content.dataset.warm || 'Walking';
      state.timers.warmup = Math.floor(minutes*60);
      // start timer page
      startTimerPage('Warmup: ' + warmType, state.timers.warmup, ()=>{
        // after warmup done -> ask dynamic stretching
        askDynamicStretch();
      });
    });
    document.getElementById('skipWarm').addEventListener('click', ()=> askDynamicStretch());
  } else {
    // skip warmup -> go to dynamic stretching question
    askDynamicStretch();
  }
}
function askDynamicStretch(){
  content.innerHTML = `
    <h1>Dynamic Stretching?</h1>
    <p>Would you like to do dynamic stretching before lifting?</p>
    <div class="controls">
      <button class="btn" id="dynYes">Yes</button>
      <button class="btn secondary" id="dynNo">No</button>
    </div>
  `;
  document.getElementById('dynYes').addEventListener('click', ()=> dynamicStretching(true));
  document.getElementById('dynNo').addEventListener('click', ()=> dynamicStretching(false));
}

function dynamicStretching(yes){
  if(yes){
    content.innerHTML = `
      <h1>Dynamic Stretching</h1>
      <p>Choose dynamic stretches and set duration (minutes)</p>
      <div class="check-list" id="dynList"></div>
      <div style="margin-top:8px">
        <label>Duration (minutes): <input type="number" id="dynMinutes" min="1" value="5"></label>
      </div>
      <div style="margin-top:8px" class="controls">
        <button class="btn" id="startDyn">Start</button>
        <button class="btn secondary" id="skipDyn">Skip</button>
      </div>
    `;
    const options = ["Leg Swings","Torso Twists","Arm Circles","Lateral Lunge","Inchworm","Hip Circles"];
    const list = document.getElementById('dynList');
    options.forEach(o=>{
      list.appendChild(el(`<label><input type="checkbox" value="${o}"> ${o}</label>`));
    });
    document.getElementById('startDyn').addEventListener('click', ()=>{
      const mins = parseFloat(document.getElementById('dynMinutes').value)||0;
      if(mins<=0){ alert('Enter a positive time'); return; }
      const chosen = Array.from(list.querySelectorAll('input:checked')).map(i=>i.value);
      if(chosen.length===0){ alert('Choose at least one dynamic stretch to start.'); return; }
      state.timers.dynamic = Math.floor(mins*60);
      startTimerPage('Dynamic Stretching', state.timers.dynamic, ()=> {
        // after dynamic -> start lifting
        startLifting();
      });
    });
    document.getElementById('skipDyn').addEventListener('click', ()=> startLifting());
  } else {
    // no dynamic -> go straight to lifting
    startLifting();
  }
}
function startTimerPage(title, seconds, onDone){
  // Renders a timer with given seconds. When it hits zero, call onDone.
  let remaining = seconds;
  content.innerHTML = `
    <h1>${title}</h1>
    <p>Timer: <span id="timerDisplay">${formatTimeSec(remaining)}</span></p>
    <div class="controls">
      <button class="btn" id="timerStart">Start</button>
      <button class="btn secondary" id="timerPause">Pause</button>
      <button class="btn secondary" id="timerStop">Stop</button>
    </div>
  `;
  const display = document.getElementById('timerDisplay');
  let interval = null;
  document.getElementById('timerStart').addEventListener('click', ()=>{
    if(interval) return;
    interval = setInterval(()=> {
      remaining--;
      display.textContent = formatTimeSec(remaining);
      if(remaining<=0){
        clearInterval(interval); interval = null;
        alert(title + ' complete!');
        onDone && onDone();
      }
    },1000);
  });
  document.getElementById('timerPause').addEventListener('click', ()=> {
    if(interval){ clearInterval(interval); interval=null; }
  });
  document.getElementById('timerStop').addEventListener('click', ()=> {
    if(interval){ clearInterval(interval); interval=null; }
    if(confirm('Stop the timer early?')) {
      onDone && onDone();
    } else {
      // do nothing
    }
  });
}

function startLifting(){
  // Lifting page: timer top, left side exercises chosen with ____x____ inputs, Until Failure button for each
  state.workoutStartTs = Date.now();
  content.innerHTML = `
    <h1>Let's Start Lifting!</h1>
    <p>Workout timer is shown below. Fill sets & reps under each exercise. Use <em>Until Failure</em> if needed to power up the character.</p>
    <div class="timer-box">
      <label>Planned workout length (minutes): <input type="number" id="workoutMinutes" min="1" value="30"></label>
      <div style="margin-left:auto">
        <span class="muted">Elapsed: </span><strong id="workoutElapsed">00:00</strong>
      </div>
    </div>
    <div id="exercisesContainer"></div>
    <div style="margin-top:10px" class="controls">
      <button class="btn danger" id="stopWorkout">Stop Workout</button>
    </div>
  `;
  const exC = document.getElementById('exercisesContainer');
  Object.keys(state.liftingData).forEach(ex => {
    const item = el(`
      <div class="exercise-item">
        <div class="left">
          <strong>${ex}</strong>
          <div class="muted">Enter your sets x reps</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="sets-reps">
            <input placeholder="sets" data-ex="${ex}" class="setsInput" />
            <span class="muted">x</span>
            <input placeholder="reps" data-ex="${ex}" class="repsInput" />
          </div>
          <button class="btn secondary untilBtn" data-ex="${ex}">Until Failure</button>
        </div>
      </div>
    `);
    exC.appendChild(item);
  });
  // Workout timer elapsed
  let elapsed = 0;
  const elapsedDisplay = document.getElementById('workoutElapsed');
  const workoutInterval = setInterval(()=> {
    elapsed++;
    elapsedDisplay.textContent = formatTimeSec(elapsed);
  },1000);
  // Until Failure toggles
  document.querySelectorAll('.untilBtn').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const ex = ev.currentTarget.dataset.ex;
      state.liftingData[ex].untilFailure = true;
      // visual: change character
      markCharacterSuper();
      // small animation: revert after 5s
      setTimeout(()=> {
        // keep super only while untilFailure maybe; we'll revert when user continues
      markCharacterNormal();
      }, 5000);
    });
  });

  // save sets/reps in state on input change
  document.querySelectorAll('.setsInput').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const ex = e.target.dataset.ex;
      state.liftingData[ex].sets = e.target.value;
    })
  });
  document.querySelectorAll('.repsInput').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const ex = e.target.dataset.ex;
      state.liftingData[ex].reps = e.target.value;
    })
  });

  document.getElementById('stopWorkout').addEventListener('click', ()=>{
    clearInterval(workoutInterval);
    // finalize workout duration
    const totalElapsed = Math.floor((Date.now() - state.workoutStartTs)/1000);
    state.timers.workout = totalElapsed;
    showWorkoutResults();
  });
  sessionInfo.textContent = `Working: ${state.selectedPart ? partName(state.selectedPart) : ''}`;
}

function showWorkoutResults(){
  // results page: show lifts and time. Buttons: End Workout (save to calendar), Static Stretching?, Post-Cardio?
  const results = Object.keys(state.liftingData).map(ex=>{
    const d = state.liftingData[ex];
    return {ex, sets: d.sets || '-', reps: d.reps || '-', untilFailure: d.untilFailure ? 'Yes' : 'No'};
  });
  content.innerHTML = `
    <h1>Workout Results</h1>
    <p>Summary of lifts and time</p>
    <div class="result-list" id="resultsList"></div>
    <div style="margin-top:12px"><strong>Workout time:</strong> ${formatTimeSec(state.timers.workout)}</div>
    <div style="margin-top:12px" class="controls">
      <button class="btn" id="endWorkout">End Workout</button>
      <button class="btn secondary" id="gotoStatic">Static Stretching?</button>
      <button class="btn secondary" id="gotoPostCardio">Post-Cardio?</button>
    </div>
  `;
  const resList = document.getElementById('resultsList');
  results.forEach(r=>{
    resList.appendChild(el(`<div class="result-item"><strong>${r.ex}</strong> - ${r.sets} x ${r.reps} - Until Failure: ${r.untilFailure}</div>`));
  });

  document.getElementById('endWorkout').addEventListener('click', ()=> {
    saveWorkoutToCalendar();
    alert('Saved workout to calendar. Returning home.');
    state.pickedExercises = []; state.liftingData = {};
    renderHome();
    setActiveMenu(null);
  });
  document.getElementById('gotoStatic').addEventListener('click', ()=> {
    renderStaticStretching(true);
  });
  document.getElementById('gotoPostCardio').addEventListener('click', ()=> {
    renderPostCardio();
  });
}
function saveWorkoutToCalendar(){
  const cal = loadCalendar();
  const dateKey = (new Date()).toISOString().slice(0,10);
  const entry = {
    ts: Date.now(),
    part: state.selectedPart,
    exercises: Object.keys(state.liftingData).map(ex=> ({ex, ...state.liftingData[ex]})),
    durationSec: state.timers.workout
  };
  if(!cal[dateKey]) cal[dateKey] = [];
  cal[dateKey].push(entry);
  saveCalendar(cal);
}

function renderStaticStretching(isFromResults){
  // static stretching page: checkbox list, must pick at least one, start timer
  content.innerHTML = `
    <h1>Static Stretching</h1>
    <p>Pick at least one static stretch, set duration (minutes), then Start.</p>
    <div class="check-list" id="staticList"></div>
    <div style="margin-top:8px">
      <label>Duration (minutes): <input type="number" id="staticMinutes" min="1" value="5"></label>
    </div>
    <div style="margin-top:8px" class="controls">
      <button class="btn" id="startStatic">Start</button>
      <button class="btn secondary" id="cancelStatic">Cancel</button>
    </div>
  `;
  const options = ["Hamstring Stretch","Quad Stretch","Chest Stretch","Shoulder Stretch","Calf Stretch","Hip Flexor Stretch"];
  const list = document.getElementById('staticList');
  options.forEach(o=> list.appendChild(el(`<label><input type="checkbox" value="${o}"> ${o}</label>`)));
  document.getElementById('startStatic').addEventListener('click', ()=>{
    const mins = parseFloat(document.getElementById('staticMinutes').value)||0;
    const chosen = Array.from(list.querySelectorAll('input:checked')).map(i=>i.value);
    if(chosen.length===0){ alert('Choose at least one static stretch to start.'); return; }
    if(mins<=0){ alert('Enter positive time'); return; }
    startTimerPage('Static Stretching', Math.floor(mins*60), ()=>{
      // on done: ask Post-Cardio or End Workout
      content.innerHTML = `
        <h1>Done Stretching</h1>
        <div class="controls">
          <button class="btn" id="toPostCardio">Post-Cardio?</button>
          <button class="btn secondary" id="toEnd">End Workout</button>
        </div>
      `;
      document.getElementById('toPostCardio').addEventListener('click', ()=> renderPostCardio());
      document.getElementById('toEnd').addEventListener('click', ()=> { saveWorkoutToCalendar(); alert('Workout saved.'); renderHome(); });
    });
  });
  document.getElementById('cancelStatic').addEventListener('click', ()=> renderHome());
}

function renderPostCardio(){
  content.innerHTML = `
    <h1>Post-Workout Cardio</h1>
    <p>Choose a cardio option and start timer</p>
    <div class="controls">
      <button class="btn cardio" data-cardio="Walking">Walking</button>
      <button class="btn cardio" data-cardio="Running">Running</button>
      <button class="btn cardio" data-cardio="Bicycle">Bicycle</button>
      <button class="btn cardio" data-cardio="Stairmaster">Stairmaster</button>
    </div>
    <div style="margin-top:10px">
      <label>Duration (minutes): <input type="number" id="cardioMinutes" min="1" value="10"></label>
      <div style="margin-top:8px" class="controls">
        <button class="btn" id="startCardio">Start</button>
        <button class="btn secondary" id="skipCardio">Skip</button>
      </div>
    </div>
  `;
  document.querySelectorAll('.cardio').forEach(b=> b.addEventListener('click', (e)=> {
    document.querySelectorAll('.cardio').forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    content.dataset.cardio = e.currentTarget.dataset.cardio;
  }));
  document.getElementById('startCardio').addEventListener('click', ()=>{
    const mins = parseFloat(document.getElementById('cardioMinutes').value)||0;
    if(mins<=0){ alert('Enter valid time'); return; }
    state.timers.cardio = Math.floor(mins*60);
    const type = content.dataset.cardio || 'Walking';
    startTimerPage('Post-Cardio: '+type, state.timers.cardio, ()=> {
      // after cardo: show End or Static Stretching
      content.innerHTML = `
        <h1>Post-Cardio Complete</h1>
        <div class="controls">
          <button class="btn" id="endNow">End Workout</button>
          <button class="btn secondary" id="gotoStatic2">Static Stretching?</button>
        </div>
      `;
      document.getElementById('endNow').addEventListener('click', ()=> { saveWorkoutToCalendar(); renderHome(); });
      document.getElementById('gotoStatic2').addEventListener('click', ()=> renderStaticStretching(false));
    });
  });
  document.getElementById('skipCardio').addEventListener('click', ()=> {
    // go to end options
    content.innerHTML = `
      <h1>Skip Cardio</h1>
      <div class="controls">
        <button class="btn" id="endNow2">End Workout</button>
        <button class="btn secondary" id="gotoStatic3">Static Stretching?</button>
      </div>
    `;
    document.getElementById('endNow2').addEventListener('click', ()=> { saveWorkoutToCalendar(); renderHome(); });
    document.getElementById('gotoStatic3').addEventListener('click', ()=> renderStaticStretching(false));
  });
}

/* Calendar view */
function renderCalendarView(){
  const cal = loadCalendar();
  content.innerHTML = `
    <div class="cal-head">
      <div>
        <h1>Workout Calendar</h1>
        <div class="muted">Saved workouts</div>
      </div>
      <div>
        <button class="btn" id="clearCal">Clear Calendar</button>
        <button class="btn secondary" id="backHomeCal">Back</button>
      </div>
    </div>
    <div id="calendar"></div>
  `;
  // Show current month grid
  const calendarDiv = document.getElementById('calendar');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month+1, 0);
  const startWeekday = first.getDay(); // 0-6 Sun-Sat
  const days = last.getDate();
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  // Add weekday headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=> {
    const hd = document.createElement('div'); hd.textContent = d; hd.style.fontWeight = '700'; grid.appendChild(hd);
  });
  // fill blanks before first
  for(let i=0;i<startWeekday;i++){
    const blank = document.createElement('div'); blank.className='cal-day'; grid.appendChild(blank);
  }
  for(let d=1;d<=days;d++){
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className='cal-day';
    const has = cal[key] ? 1 : 0;
    cell.dataset.has = has;
    cell.innerHTML = `<div style="font-weight:700">${d}</div>`;
    if(has){
      cal[key].forEach(entry=>{
        const e = document.createElement('div'); e.style.fontSize='12px'; e.style.marginTop='6px';
        e.textContent = `${partName(entry.part || '')} (${Math.round(entry.durationSec/60)}m)`;
        cell.appendChild(e);
      });
    }
    grid.appendChild(cell);
  }
  calendarDiv.appendChild(grid);

  document.getElementById('backHomeCal').addEventListener('click', ()=> renderHome());
  document.getElementById('clearCal').addEventListener('click', ()=> {
    if(confirm('Clear all saved calendar workouts?')){ localStorage.removeItem(state.calendarKey); renderCalendarView(); }
  });
}
/* Home */
function renderHome(){
  content.innerHTML = `
    <h1>Welcome</h1>
    <p>Pick a body part from the left to start building your Super Saiyan workout.</p>
    <div class="controls">
      <button class="btn" id="startBtn2">Pick a Workout</button>
      <button class="btn secondary" id="openCalendar">Open Calendar</button>
    </div>
    <div class="footer-note">Workouts saved locally in this browser.</div>
  `;
  document.getElementById('startBtn2').addEventListener('click', ()=> alert('Pick a body part on the left to begin.'));
  document.getElementById('openCalendar').addEventListener('click', ()=> renderCalendarView());
  sessionInfo.textContent = 'Power';
  markCharacterNormal();
}

/* initial */
renderHome();

/* Small enhancement: clicking the character toggles a fancy look */
document.getElementById('characterBox').addEventListener('click', ()=>{
  if(charImg.classList.contains('char-super')) markCharacterNormal(); else markCharacterSuper();
});