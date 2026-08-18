const fs = require('fs');
let code = fs.readFileSync('src/components/wo-list-screen.tsx', 'utf8');

code = code.replace("Work Order (Alat)", "WO Perbaikan");

// Fix the mapping logic for "wo" tab
// Currently it is:
// {activeTab === 'wo' && sortedWoData.length === 0 ? (
//    ...
// ) : (
//    sortedWoData.map(...)
// )}
code = code.replace("{activeTab === 'wo' && sortedWoData.length === 0 ? (", "{activeTab === 'wo' ? sortedWoData.length === 0 ? (");

// Since we replaced the condition, we need to add the else branch for `activeTab === 'wo' ?` which is `: null}`
// Let's find the `)}` before `{activeTab === 'ticket'` and replace it with `: null}`

// We'll just do a targeted replace for that exact block end
const endBlock = `
              )}
            </Card>
          ))
        )}
      
        {activeTab === 'ticket'`;

const newEndBlock = `
              )}
            </Card>
          ))
        ) : null}
      
        {activeTab === 'ticket'`;
code = code.replace(endBlock, newEndBlock);

fs.writeFileSync('src/components/wo-list-screen.tsx', code);
