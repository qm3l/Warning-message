function onGoogleSignIn() {
  google.accounts.id.initialize({
    client_id: "YOUR_CLIENT_ID_HERE",
    callback: handleCredentialResponse
  });
  google.accounts.id.prompt();
}

function handleCredentialResponse(response) {
  console.log("تم تسجيل الدخول:", response.credential);
  alert("تم تسجيل الدخول بنجاح!");
}

document.getElementById("googleSignIn").addEventListener("click", onGoogleSignIn);
