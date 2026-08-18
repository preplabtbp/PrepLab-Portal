async function test() {
    const res = await fetch("https://drive.google.com/uc?export=download&id=1Z1as0leRN6MbtadW7yOIAXYzAswDWmmt");
    console.log("Status:", res.status);
    console.log("Headers:", res.headers);
    const text = await res.text();
    console.log("Text snippet:", text.substring(0, 200));
}
test();
