const formData = new FormData();
formData.append('userId', '2');
formData.append('skills', 'Cooking');
formData.append('experience', '5');
formData.append('nationalId', '123456789012345');
formData.append('recommendation', 'Good worker');
formData.append('additionalPhoto', new Blob(['test file content'], { type: 'text/plain' }), 'test.txt');

fetch('http://localhost:3000/api/worker/profile', {
  method: 'POST',
  body: formData
}).then(res => {
  console.log('Status:', res.status, res.headers.get('content-type'));
  return res.text();
}).then(console.log)
  .catch(console.error);
