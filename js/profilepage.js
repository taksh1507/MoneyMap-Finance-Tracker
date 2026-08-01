import { getUserProfile, logout, getLoggedInUser, updateUserProfile } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const loggedInEmail = getLoggedInUser();

  if (!loggedInEmail) {
    alert('Please sign in to view your profile.');
    window.location.href = 'signin.html';
    return;
  }

  const profileView = document.getElementById("profileView");
  const profileEdit = document.getElementById("profileEdit");

  // Toggle profile info display
  function toggleProfile() {
    const profileInfo = document.getElementById("profileInfo");
    profileInfo.style.display = profileInfo.style.display === "block" ? "none" : "block";
    profileView.style.display = "block";
    profileEdit.style.display = "none";
  }

  function renderProfile() {
    const profile = getUserProfile();
    document.getElementById("loggedUserFName").innerText = profile.firstName || 'User';
    document.getElementById("loggedUserLName").innerText = profile.lastName || '';
    document.getElementById("loggedUserEmail").innerText = loggedInEmail;
    
    document.getElementById("editFName").value = profile.firstName || '';
    document.getElementById("editLName").value = profile.lastName || '';
  }

  renderProfile();

  document.getElementById("toggleButton").addEventListener("click", toggleProfile);
  
  document.getElementById("editProfileBtn").addEventListener("click", () => {
    profileView.style.display = "none";
    profileEdit.style.display = "block";
  });

  document.getElementById("cancelEditBtn").addEventListener("click", () => {
    profileView.style.display = "block";
    profileEdit.style.display = "none";
  });

  document.getElementById("saveProfileBtn").addEventListener("click", () => {
    const newFName = document.getElementById("editFName").value;
    const newLName = document.getElementById("editLName").value;
    updateUserProfile({ firstName: newFName, lastName: newLName });
    renderProfile();
    profileView.style.display = "block";
    profileEdit.style.display = "none";
  });

  const logoutButton = document.getElementById("logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
      window.location.href = "../index.html";
    });
  }
});
