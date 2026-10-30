import test from "node:test";
import assert from "node:assert/strict";
import {validateDays,renderCard} from "./update-contributions.mjs";
const input=[
 {date:"2024-02-28",contributionCount:2,contributionLevel:"FIRST_QUARTILE"},
 {date:"2024-02-29",contributionCount:3,contributionLevel:"SECOND_QUARTILE"},
 {date:"2024-03-01",contributionCount:0,contributionLevel:"NONE"},
];
test("calendar accepts leap day and sorts dates",()=>assert.equal(validateDays([...input].reverse())[1].date,"2024-02-29"));
test("calendar rejects invalid dates, counts, duplicates and gaps",()=>{
 assert.throws(()=>validateDays([{...input[0],date:"2023-02-29"}]));
 assert.throws(()=>validateDays([{...input[0],contributionCount:-1}]));
 assert.throws(()=>validateDays([input[0],input[0]]));
 assert.throws(()=>validateDays([input[0],input[2]]));
});
test("card shows correct totals and streak with no executable content",()=>{
 const svg=renderCard(input,"internalforces");
 assert.match(svg,/총 5회 기여, 활동한 날 2일, 최장 연속 2일/);
 assert.equal((svg.match(/class="day"/g)||[]).length,3);
 assert.doesNotMatch(svg,/<script|<foreignObject/);
 assert.match(svg,/prefers-reduced-motion/);
});
test("light and dark cards escape labels and retain real dates",()=>{
 const svg=renderCard(input,'<test>','dark');
 assert.match(svg,/&lt;test&gt;/);
 assert.match(svg,/#1b241e/);
 assert.match(svg,/2024.02.29|2024-02-29/);
});
