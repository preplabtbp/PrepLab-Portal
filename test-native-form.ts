async function run() {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const formData = new FormData();
  formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
  formData.append('action', 'upload');
  formData.append('source', b64);
  formData.append('format', 'json');
  
  try {
      const res = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      console.log("FreeImage:", json);
  } catch(e) {
      console.error(e.message);
  }
}
run();
