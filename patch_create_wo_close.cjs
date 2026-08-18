const fs = require('fs');
let code = fs.readFileSync('src/components/create-wo-screen.tsx', 'utf8');

const closeString = `        </form>
      </Card>
      </>
      )}
      {activeWoTab === 'permintaan' && <CreateInternalTicketScreen inspectorName={inspectorName} inspectorNik={inspectorNik} onBack={() => {}} />}
    </div>`;
code = code.replace("        </form>\n      </Card>\n    </div>", closeString);

fs.writeFileSync('src/components/create-wo-screen.tsx', code);
