
fetch("http://localhost:8000/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@schools.up", password: "Admin@123" })
}).then(r => r.json()).then(console.log).catch(console.error);

