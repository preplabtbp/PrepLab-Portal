const fs = require('fs');
let code = fs.readFileSync('src/components/quiz-screen.tsx', 'utf-8');

const searchStr = `        setQuestions(finalQuestions);
        
        const autosaveKey = \`quiz_autosave_\${inspectorNik}_\${activeVersion}\`;`;

const activeVerCode = `        let activeVersion = '';
        if (quizConfigSetting && quizConfigSetting.settingValue) {
           const parsed = JSON.parse(quizConfigSetting.settingValue);
           activeVersion = parsed.version || '';
        }`;

code = code.replace(
  '        setQuestions(finalQuestions);\n        \n        const autosaveKey = `quiz_autosave_${inspectorNik}_${activeVersion}`;',
  `        setQuestions(finalQuestions);\n${activeVerCode}\n        const autosaveKey = \`quiz_autosave_\${inspectorNik}_\${activeVersion}\`;`
);

code = code.replace(
  '        } else {\n          setAnswers({});\n          setCurrentIndex(0);\n          setTimeLeft(30 * 60);\n        }\n        let activeVersion = \'\';\n        if (quizConfigSetting && quizConfigSetting.settingValue) {\n           const parsed = JSON.parse(quizConfigSetting.settingValue);\n           activeVersion = parsed.version || \'\';\n        }',
  `        } else {\n          setAnswers({});\n          setCurrentIndex(0);\n          setTimeLeft(30 * 60);\n        }`
);

fs.writeFileSync('src/components/quiz-screen.tsx', code);
