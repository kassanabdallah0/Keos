
export default class ajaxrequest {
    async ajaxCall(url, data, type = 'POST', contentType = 'application/json; charset=utf-8', dataType = 'json') {
      try {
        const response = await new Promise((resolve, reject) => {
          $.ajax({
            url: url,
            type: type,
            data: JSON.stringify(data),
            contentType: contentType,
            dataType: dataType,
            success: resolve,
            error: (jqXHR, textStatus, errorThrown) => {
              console.error("AJAX Request Failed:", {
                jqXHR: jqXHR,
                textStatus: textStatus,
                errorThrown: errorThrown
              });
              reject(new Error(`AJAX Error: ${textStatus}; Status Code: ${jqXHR.status}; Error Thrown: ${errorThrown}`));
            }
          });
        });
        return response;
    
      } catch (error) {
        console.error("Exception caught in ajaxCall:", error);
        return null;
      }
    }
  }