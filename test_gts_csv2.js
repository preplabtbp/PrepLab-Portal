async function test() {
    try {
        const res = await fetch("https://drive.usercontent.google.com/download?id=17DPii_qPB8UNcrwMbRJqcMz5-1WHRVdC&export=download");
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Snippet:", text.substring(0, 300));
    } catch(e) { console.error(e); }
}
test();
