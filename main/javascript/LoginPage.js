// Preload the images and apply animation when loaded
var telecomImages = document.querySelectorAll('.telecom-image');
function applySlideAnimation(element, index) {
  setTimeout(function() {
    element.classList.add('show');
  }, index * 500);
}
function validateForm() {
    var username = $("#Username").val().trim();
    var password = $("#Password").val().trim();
    if (username === "" || password === "") {
        $("#errorMessage").text("Both fields are required");
        return false;
    }
    return true;
}
telecomImages.forEach(applySlideAnimation);
// Add a loading spinner element
var loadingSpinner = '<div id="loadingSpinner" style="display:none;">Loading...</div>';
// Add the loading spinner to the DOM, e.g., at the end of the form
$("#loginForm").append(loadingSpinner);
$(document).ready(function() {
  $("#loginForm").on("submit", function(event) {
    event.preventDefault();
    if (!validateForm()) {
        return;
    }
    // Disable the submit button and show the loading spinner
    $("#submitButton").prop("disabled", true);
    $("#loadingSpinner").show();
    var formData = $(this).serialize();
    console.log(1);
    // Send the form data using Ajax
    $.ajax({
      type: "POST",
      url: "http://planningfix.keos-telecom.com/PHPPlanning/login_handler.php",
      data: formData,
      dataType: "json",
      success: function(response) {
        // Enable the submit button and hide the loading spinner
        $("#submitButton").prop("disabled", false);
        $("#loadingSpinner").hide();
        console.log("Success:", response["success"]);
        window.location.replace(response.redirect);

      },

      error: function(jqXHR, textStatus, errorThrown) {
        console.log("An unexpected error occurred.",jqXHR)
        console.log(textStatus)
        console.log(errorThrown)
        // Enable the submit button and hide the loading spinner
        $("#submitButton").prop("disabled", false);
        $("#loadingSpinner").hide();
        $("#errorMessage").text("An unexpected error occurred.");
      }
    });
  console.log(321) 
  });

});


