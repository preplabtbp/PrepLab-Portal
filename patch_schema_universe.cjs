const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

if (!code.includes("universe: text('universe')")) {
    code = code.replace(
        /export const bulletinPosts = pgTable\('bulletin_posts', \{/g,
        "export const bulletinPosts = pgTable('bulletin_posts', {\n  universe: text('universe').default('TBP_GPS'),"
    );
    
    code = code.replace(
        /export const bulletinComments = pgTable\('bulletin_comments', \{/g,
        "export const bulletinComments = pgTable('bulletin_comments', {\n  universe: text('universe').default('TBP_GPS'),"
    );
    
    code = code.replace(
        /export const agendaEvents = pgTable\('agenda_events', \{/g,
        "export const agendaEvents = pgTable('agenda_events', {\n  universe: text('universe').default('TBP_GPS'),"
    );

    code = code.replace(
        /export const uploadedFiles = pgTable\('uploaded_files', \{/g,
        "export const uploadedFiles = pgTable('uploaded_files', {\n  universe: text('universe').default('TBP_GPS'),"
    );

    fs.writeFileSync('src/db/schema.ts', code);
    console.log("Patched schema.ts for universes");
}
