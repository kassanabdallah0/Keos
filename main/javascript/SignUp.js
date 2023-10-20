$(document).ready(function() {
      // Check password strength
    $("#password").on('input', function() {
      var password = $(this).val();
      var result = zxcvbn(password);
  
      $("#password-strength").text("Strength: " + result.score);
    });
    // Validate form on submit
    $("#signup-form").on('submit', function(e) {
      
      if (this.checkValidity() === false) {
        e.stopPropagation();
      }
      $(this).addClass('was-validated');
      e.preventDefault();
      var password = $("#password").val();
      var confirmPassword = $("#confirm-password").val();
  
      if(password !== confirmPassword) {
        $("#confirm-password").addClass('is-invalid');
        return;
      }
  
  var email = $("#email").val();
  var confirmEmail = $("#confirm-email").val();
  
  if(email !== confirmEmail) {
    $("#confirm-email").addClass('is-invalid');
    return;
  }
  
  var emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  
  if(!emailRegex.test(email)) {
    $("#email").addClass('is-invalid');
    return;
  }
  
    var recaptcha = $(".g-recaptcha-response").val();
    if (recaptcha === "") {
      alert("Please check the reCAPTCHA");
      return;
    }
    var formData = $(this).serialize();
    // Send the form data using Ajax
    $.ajax({
      type: "POST",
      url: "./PHPPlanning/Sign_Up.php",
      data: formData,
      success: function(response) {
        console.log(1)
        window.location.replace('http://planningfix.keos-telecom.com/LoginPage.html');
        // Handle success
        console.log("Success:", response);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        // Handle error
        console.log("Error:", textStatus, errorThrown);
      }
    });
  });
});
  