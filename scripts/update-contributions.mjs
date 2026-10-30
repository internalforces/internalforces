import { mkdir, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const DAY = 86400000;
const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);

export function validateDays(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 378) throw new Error("Invalid contribution calendar length.");
  const days = input.map(day => {
    if (!day || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0 || !LEVELS.includes(day.contributionLevel)) throw new Error("Invalid contribution day.");
    const time = Date.parse(day.date + "T00:00:00Z");
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== day.date) throw new Error("Invalid date.");
    return { ...day, time, level: LEVELS.indexOf(day.contributionLevel) };
  }).sort((a,b) => a.time - b.time);
  for (let i=1; i<days.length; i++) if (days[i].time - days[i-1].time !== DAY) throw new Error("Contribution dates must be unique and consecutive.");
  return days;
}

export function renderCard(input, username, theme = "light") {
  const days = validateDays(input);
  const palette = theme === "dark"
    ? { bg: "#1b241e", ink: "#e4ebe4", secondary: "#a2b0a4", muted: "#8c9e90", border: "#2d3a30", levels: ["#2c3930","#3b5639","#5a7e4b","#8cb66b","#bbd997"] }
    : { bg: "#ffffff", ink: "#1d2921", secondary: "#69766d", muted: "#748078", border: "#e6ebe5", levels: ["#edf1e9","#d0e6b9","#9cc87c","#65a35c","#34734b"] };
  const total = days.reduce((sum,day) => sum + day.contributionCount,0);
  const active = days.filter(day => day.contributionCount > 0).length;
  let longest=0, streak=0;
  for (const day of days) { streak = day.contributionCount > 0 ? streak + 1 : 0; longest = Math.max(longest,streak); }
  const lead = new Date(days[0].time).getUTCDay();
  const weeks = Math.ceil((days.length + lead)/7);
  const step = Math.min(16, 866 / weeks);
  const cell = step - 4;
  const monthLabels=[];
  for (let index=0; index<days.length; index++) {
    const date=new Date(days[index].time);
    const column=Math.floor((index+lead)/7);
    if(index===0 || date.getUTCDate()===1) monthLabels.push({ month: date.getUTCMonth()+1, column });
  }
  if(monthLabels.length>1 && monthLabels[1].column-monthLabels[0].column<3) monthLabels.shift();
  const months=monthLabels.map(item => '<text x="'+(84+item.column*step)+'" y="156" class="muted small">'+item.month+'월</text>').join("");
  const cells=days.map((day,index) => {
    const col=Math.floor((index+lead)/7), row=(index+lead)%7;
    const delay=Math.round((col+row)/Math.max(1,weeks+5)*420);
    return '<rect class="day" x="'+(84+col*step)+'" y="'+(176+row*16)+'" width="'+cell+'" height="12" rx="3" fill="'+palette.levels[day.level]+'" style="animation-delay:'+delay+'ms"><title>'+escape(day.date)+' · '+day.contributionCount+'회 기여</title></rect>';
  }).join("");
  const labels=["","월","","수","","금",""].map((label,row) => label ? '<text x="42" y="'+(186+row*16)+'" class="muted small">'+label+'</text>' : "").join("");
  const legend=palette.levels.map((fill,index) => '<rect x="'+(840+index*16)+'" y="302" width="12" height="12" rx="3" fill="'+fill+'"/>').join("");
  const formatted = new Intl.NumberFormat("ko-KR").format(total);
  const start=days[0].date.replaceAll("-","."), end=days.at(-1).date.replaceAll("-",".");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="350" viewBox="0 0 1000 350" role="img" aria-labelledby="title description">'+
    '<title id="title">'+escape(username)+'의 Contribution Garden</title><desc id="description">'+start+'부터 '+end+'까지 총 '+total+'회 기여, 활동한 날 '+active+'일, 최장 연속 '+longest+'일.</desc>'+
    '<style>text{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;fill:'+palette.ink+'}.muted{fill:'+palette.muted+'}.small{font-size:11px}.day{animation:bloom .6s cubic-bezier(.16,1,.3,1) both;transform-box:fill-box;transform-origin:center}@keyframes bloom{from{opacity:0;transform:translateY(2px) scale(.7)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.day{animation:none}}</style>'+
    '<rect x=".5" y=".5" width="999" height="349" rx="18" fill="'+palette.bg+'" stroke="'+palette.border+'"/>'+
    '<g fill="'+palette.levels[4]+'"><rect x="32" y="25" width="6" height="6" rx="1.5"/><rect x="41" y="25" width="6" height="6" rx="1.5"/><rect x="32" y="34" width="6" height="6" rx="1.5"/><rect x="41" y="34" width="6" height="6" rx="1.5"/></g>'+
    '<text x="57" y="37" font-size="13" font-weight="600">contribution <tspan fill="'+palette.secondary+'" font-weight="400">garden</tspan></text>'+
    '<text x="32" y="79" font-size="26" font-weight="600" letter-spacing="-1">꾸준함이 자라는 곳<tspan fill="'+palette.levels[3]+'">.</tspan></text>'+
    '<text x="33" y="105" font-size="12" fill="'+palette.secondary+'">@'+escape(username)+' · 작은 기여 하나가 쌓여, 나만의 정원이 됩니다.</text>'+
    '<text x="580" y="72" font-size="31" font-weight="500">'+formatted+'<tspan font-size="12" fill="'+palette.secondary+'"> 회</tspan></text><text x="581" y="99" class="muted small">최근 1년의 기여</text>'+
    '<text x="755" y="72" font-size="31" font-weight="500">'+active+'<tspan font-size="12" fill="'+palette.secondary+'"> 일</tspan></text><text x="756" y="99" class="muted small">활동한 날</text>'+
    '<text x="885" y="72" font-size="31" font-weight="500">'+longest+'<tspan font-size="12" fill="'+palette.secondary+'"> 일</tspan></text><text x="886" y="99" class="muted small">최장 연속 기록</text>'+
    '<path d="M32 128H968" stroke="'+palette.border+'"/>'+months+labels+cells+
    '<text x="33" y="312" class="muted small">'+start+' — '+end+'</text><text x="810" y="312" class="muted small">적음</text>'+legend+'<text x="928" y="312" class="muted small">많음</text>'+
    '<text x="33" y="335" class="muted" font-size="9">GitHub contributions · daily update</text><text x="968" y="335" class="muted" font-size="9" text-anchor="end">A LITTLE EVERY DAY</text></svg>\n';
}

async function update() {
  const username=process.env.GITHUB_USERNAME || "internalforces";
  const token=process.env.GITHUB_TOKEN;
  if(!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new Error("Invalid GitHub username.");
  if(!token) throw new Error("GITHUB_TOKEN is required; use the repository workflow.");
  const response=await fetch("https://api.github.com/graphql",{
    method:"POST",
    signal:AbortSignal.timeout(30000),
    headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","User-Agent":"contribution-garden"},
    body:JSON.stringify({query:"query($login:String!){ user(login:$login){ contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount contributionLevel } } } } } }",variables:{login:username}})
  });
  if(!response.ok) throw new Error("GitHub API returned HTTP "+response.status);
  const result=await response.json();
  if(result.errors?.length) throw new Error("GitHub GraphQL: "+result.errors.map(error=>error.message).join("; "));
  const weeks=result.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if(!Array.isArray(weeks)) throw new Error("GitHub did not return a contribution calendar.");
  const days=validateDays(weeks.flatMap(week=>week.contributionDays));
  const output=resolve(dirname(fileURLToPath(import.meta.url)),"../assets");
  const cards=["light","dark"].map(theme=>({theme,svg:renderCard(days,username,theme)}));
  await mkdir(output,{recursive:true});
  for(const {theme,svg} of cards){
    const path=resolve(output,"contributions-"+theme+".svg");
    await writeFile(path+".tmp",svg);
    await rename(path+".tmp",path);
  }
  console.log("Updated contribution garden for "+username+": "+days.length+" days, "+days.reduce((sum,day)=>sum+day.contributionCount,0)+" contributions.");
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  update().catch(error=>{console.error(error.message);process.exitCode=1;});
}
