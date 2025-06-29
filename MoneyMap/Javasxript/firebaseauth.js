// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// ✅ Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Function to show feedback messages
function showMessage(message, divId) {
  const messageDiv = document.getElementById(divId);
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = 1;

  setTimeout(() => {
    messageDiv.style.opacity = 0;
  }, 5000);
}

// 🔐 Sign-Up: Register and save user info in Firestore
const signUp = document.getElementById('submitSignUp');
signUp?.addEventListener('click', (event) => {
  event.preventDefault();

  const email = document.getElementById('rEmail').value;
  const password = document.getElementById('rPassword').value;
  const firstName = document.getElementById('fName').value;
  const lastName = document.getElementById('lName').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const userData = { email, firstName, lastName };

      showMessage('Account Created Successfully', 'signUpMessage');

      return setDoc(doc(db, "users", user.uid), userData);
    })
    .then(() => {
      window.location.href = 'Html/signin.html'; // Redirect after successful sign-up
    })
    .catch((error) => {
      const errorCode = error.code;
      if (errorCode === 'auth/email-already-in-use') {
        showMessage('Email Address Already Exists !!!', 'signUpMessage');
      } else {
        console.error("Sign-up error:", error);
        showMessage('Unable to create user', 'signUpMessage');
      }
    });
});

// 🔐 Sign-In: Authenticate user and redirect
const signIn = document.getElementById('submitSignIn');
signIn?.addEventListener('click', (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      localStorage.setItem('loggedInUserId', user.uid); // Save UID in local storage
      showMessage('Login is successful', 'signInMessage');
      window.location.href = 'Html/profilepage.html'; // Redirect to profile page
    })
    .catch((error) => {
      const errorCode = error.code;
      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
        showMessage('Incorrect Email or Password', 'signInMessage');
      } else {
        console.error("Sign-in error:", error);
        showMessage('Login failed', 'signInMessage');
      }
    });
});
