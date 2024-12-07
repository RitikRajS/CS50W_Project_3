document.addEventListener('DOMContentLoaded', function() {


  // Use buttons to toggle between views
  const mailboxes = ['inbox', 'sent', 'archived'];
  mailboxes.forEach(mailbox => {
    document.querySelector(`#${mailbox}`).addEventListener('click', () =>{
      load_mailbox(mailbox);
      get_mails(mailbox);
    })
  }
  )

  // Use buttons to toggle between compose
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Sending an email
  document.querySelector('#send-email').addEventListener('click', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
  get_mails('inbox'); 

});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#individual-mail').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-form').reset();
};

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#individual-mail').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

};

// Function to load the mailbox content

function get_mails(mailbox) {

  const container_header = document.querySelector('#emails-view h3')

  // API call to get the mails
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {

      const email_container = document.querySelector('#emails-view');
      email_container.innerHTML = '';
      email_container.appendChild(container_header);

      // If the mailbox is Empty

      if(emails.length === 0){

        const empty_message = document.createElement('div');
        empty_message.className = 'empty_message';
        empty_message.innerText = `No Mails in ${mailbox.toUpperCase()}`;
        email_container.append(empty_message);
        return

      };

      emails.forEach(email => {

        // Creating a new email div within the emails-view
        const email_div = document.createElement('div');
        email_div.className = 'email_contents';

        // Check if the email is read or not
        email_div.style.background = email.read ? '	#F0F0F0' : 'white';

        // Adding HTML content within the new email div
        email_div.innerHTML = `
          <span>${email.sender}</span>
          <span id="subject">${email.subject ? email.subject : 'No Subject'}</span>
          <span id="timestamp">${email.timestamp}</span>
        `;

        // Adding an Archive Button to the mail

        if (mailbox === 'inbox' || mailbox === 'archived'){
          archive_email(email, email_div)
        };


        // Viewing individual mails
        email_div.addEventListener('click', () => {

          individual_email(email.id);
        });

        // Adding the new div to the DOM
        email_container.appendChild(email_div);
      });
    })
    .catch(error => {
      console.log('Error fetching emails:', error);
    });
};



// Viewing Individual Mails

function individual_email(emailID){

  // A GET request to get individual mail content
  fetch(`/emails/${emailID}`)
    .then(response => response.json())
    .then(email_details => {
      // Hiding all other views
      document.querySelector('#emails-view').style.display = 'none';
      document.querySelector('#compose-view').style.display = 'none';
      document.querySelector('#individual-mail').style.display = 'block';

      // Populate the individual mail view
      const mail = document.querySelector('#individual-mail');
      mail.innerHTML = `
        <div>
          <div id= 'email_header'><strong>${email_details.subject || 'No Subject'}</strong></div>
          <hr>
          <div id='email_details'>
            <p><strong>From:</strong> ${email_details.sender}</p>
            <p><strong>To</strong>: ${email_details.recipients}</p>
            <div id= 'email_time'><strong>Received</strong>: ${email_details.timestamp}</div>
          </div>
          <hr>
          <div id ='email_body'>${email_details.body}</div>
          <div class="button_container">
            <button class= "reply_button">Reply</button>
          </div>
        </div>
        
      `;


      if(email_details.body === ''){
        document.querySelector('#email_body').style.display = 'none';
      };

      // Mark email as read
      fetch(`/emails/${emailID}`, {
        method: 'PUT',
        body: JSON.stringify({
          read: true,
        }),
      }).catch(error => {
        console.log('Error updating email status:', error);
      });


      // Adding Event Listener to reply button
      document.querySelector('.reply_button').addEventListener('click', (event) => {reply_mail(email_details)})

    })
    .catch(error => {
      console.log('Error fetching email details:', error);
    });

};


//Archiving And Unarchiving Emails
function archive_email(email, email_div){

  const archive_button= document.createElement('button');
  archive_button.className = 'archive_button'
  archive_button.innerHTML = email.archived ? 'Unarchive' : 'Archive';

  archive_button.addEventListener('click', (event) => {

    // Stop the onclick event of the parent to be activated
    event.stopPropagation();

    const Updated_status = !email.archived;
    const status =  Updated_status ? 'added to the Archive' : 'removed from the Archive';

    // PUT request to update the archive status

    console.log(email.id);
    fetch(`/emails/${email.id}`, {
      method:'PUT',
      body: JSON.stringify({
        archived: Updated_status
      })
    })

    .then(response => {
      if (!response.ok){
        throw new Error(`Error: ${response.status}`)
      };
      alert(`Email ID ${email.id} has been ${status}`);

      // Load the inbox page 
      load_mailbox('inbox');
      get_mails('inbox'); 
    })


    .catch(error => {
      console.log(`Error:${error}`);
      alert('Unable to Archive/Unarchive the mail')

    });
  });

  email_div.appendChild(archive_button);

};


//Reply Function

function reply_mail(email, event){
  compose_email(event);

  let subject ="";

  if (email.subject.includes('RE: ')){
    subject = email.subject;

  } else {
    subject = `RE: ${email.subject}`;

  };

  // Populating the composition fields
  document.querySelector('#compose-recipients').value = email.sender;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = `\n \n \n-----------\n 
  On ${email.timestamp}, ${email.sender} wrote:\n 
  ${email.body}`;

  //Disabling the Input Fields of Recipient and Subject

  document.getElementById('compose-recipients').disabled = true;
  document.getElementById('compose-subject').disabled = true;



};



// sending emails. 
function send_email(event){

  event.preventDefault();
  fetch('/emails', {
    method:'POST',
    headers: {
      'Content-Type':'application/json',
    },
    body: JSON.stringify({
      recipients : document.querySelector('#compose-recipients').value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value,
    })
  })
    .then(response => response.json())
    .then(results => {
      console.log(results);

      // Catches an error in the response  
      if (results.error){
        alert(`Error: ${results.error}`);

      // If no errors, load the sent page
      } else {
        load_mailbox('sent');
        get_mails('sent');
      }
      
    })

    // Catches a network error 
    .catch(error => {
      alert(`Error: ${error.message}`)
    })

  return false;
};