document.getElementById("contactForm")
.addEventListener("submit", async function(e){

    e.preventDefault();

    const status = document.getElementById("status");

    try{

        const response = await fetch("/send-mail",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body: JSON.stringify({

                name:document.getElementById("name").value,

                email:document.getElementById("email").value,

                message:document.getElementById("message").value

            })
        });

        if(response.ok){

            status.className =
            "text-success";

            status.innerText =
            "Message sent successfully!";

            document.getElementById("contactForm").reset();

        }else{

            status.className =
            "text-danger";

            status.innerText =
            "Failed to send message!";
        }

    }catch(error){

        status.className =
        "text-danger";

        status.innerText =
        "Server connection failed!";
    }

});