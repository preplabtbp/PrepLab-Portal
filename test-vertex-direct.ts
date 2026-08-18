import { execSync } from 'child_process';

async function testDirect() {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const projectId = 'project-1bcc4549-c8d6-4962-958';
  
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:generateContent`;

    console.log(`Testing Vertex AI endpoint for model: ${model}...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Halo!' }] }]
      })
    });

    const data: any = await res.json();
    if (res.status === 200) {
      console.log(`🎉 SUCCESS! Model: ${model}`);
      console.log('Result:', data.candidates?.[0]?.content?.parts?.[0]?.text);
      return;
    } else {
      console.log(`[${res.status}] ${model}:`, data.error?.message);
    }
  }
}

testDirect();
