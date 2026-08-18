const fs = require('fs');
let code = fs.readFileSync('src/components/quiz-screen.tsx', 'utf-8');

const regex1 = /setQuestions\(finalQuestions\);\s+const autosaveKey = `quiz_autosave_\$\{inspectorNik\}_\$\{activeVersion\}`;/;
const replace1 = `setQuestions(finalQuestions);
        let activeVersion = '';
        if (quizConfigSetting && quizConfigSetting.settingValue) {
           const parsed = JSON.parse(quizConfigSetting.settingValue);
           activeVersion = parsed.version || '';
        }
        const autosaveKey = \`quiz_autosave_\${inspectorNik}_\${activeVersion}\`;`;

code = code.replace(regex1, replace1);

const regex2 = /} else \{\s+setAnswers\(\{\}\);\s+setCurrentIndex\(0\);\s+setTimeLeft\(30 \* 60\);\s+\}\s+let activeVersion = '';\s+if \(quizConfigSetting && quizConfigSetting\.settingValue\) \{\s+const parsed = JSON\.parse\(quizConfigSetting\.settingValue\);\s+activeVersion = parsed\.version \|\| '';\s+\}/;

const replace2 = `} else {
          setAnswers({});
          setCurrentIndex(0);
          setTimeLeft(30 * 60);
        }`;

code = code.replace(regex2, replace2);

fs.writeFileSync('src/components/quiz-screen.tsx', code);
