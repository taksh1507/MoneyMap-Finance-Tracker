import { login, updateUserProfile } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const submitSignIn = document.getElementById('submitSignIn');
  const submitSignUp = document.getElementById('submitSignUp');

  if (submitSignIn) {
    submitSignIn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (email && password) {
        login(email);
        alert('Signed in successfully!');
        window.location.href = 'financetracker.html';
      } else {
        alert('Please enter both email and password.');
      }
    });
  }

  if (submitSignUp) {
    submitSignUp.addEventListener('click', (e) => {
      e.preventDefault();
      const fName = document.getElementById('fName').value;
      const lName = document.getElementById('lName').value;
      const email = document.getElementById('rEmail').value;
      const password = document.getElementById('rPassword').value;

      if (fName && lName && email && password) {
        login(email);
        updateUserProfile({ firstName: fName, lastName: lName, email: email });
        alert('Account created successfully!');
        window.location.href = 'financetracker.html';
      } else {
        alert('Please fill out all fields.');
      }
    });
  }
});
