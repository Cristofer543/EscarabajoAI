function updateProfilePicture(file) {
    const profileIcon = document.getElementById('profile-icon');
    const user = JSON.parse(localStorage.getItem('user'));
  
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        profileIcon.src = e.target.result;
        user.profilePictureUrl = e.target.result;
        localStorage.setItem('user', JSON.stringify(user));
      };
      reader.readAsDataURL(file);
    } else {
      profileIcon.src = 'default_profile.png';
      user.profilePictureUrl = 'default_profile.png';
      localStorage.setItem('user', JSON.stringify(user));
    }
  }