let buttonSend = document.getElementById("send")
let messageInput = document.getElementById("message")
let messageValue = document.getElementById("message_value")
let chatBody = document.querySelector(".chat_body")

buttonSend.addEventListener("click", send)


const possibleEmojis = [
    '🐀','🐁','🐭','🐹','🐂','🐃','🐄','🐮','🐅','🐆','🐯','🐇','🐐','🐑','🐏','🐴',
    '🐎','🐱','🐈','🐰','🐓','🐔','🐤','🐣','🐥','🐦','🐧','🐘','🐩','🐕','🐷','🐖',
    '🐗','🐫','🐪','🐶','🐺','🐻','🐨','🐼','🐵','🙈','🙉','🙊','🐒','🐉','🐲','🐊',
    '🐍','🐢','🐸','🐋','🐳','🐬','🐙','🐟','🐠','🐡','🐚','🐌','🐛','🐜','🐝','🐞',
  ];
  function randomEmoji() {
    var randomIndex = Math.floor(Math.random() * possibleEmojis.length);
    return possibleEmojis[randomIndex];
  }
  
  const emoji = randomEmoji();
  window.nickname = emoji
  
  if (!location.hash) {
    location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  }
  const chatHash = location.hash.substring(1);
  
  const drone = new ScaleDrone('PTC8YeqYdhgfWag8');
  const roomName = 'observable-' + chatHash;
  let room;
  
  const configuration = {
    iceServers: [{
      url: 'stun:stun.l.google.com:19302'
    }]
  };
  let pc;
  let dataChannel;
  
  drone.on('open', error => {
    if (error) {
      return console.error(error);
    }
    room = drone.subscribe(roomName);
    room.on('open', error => {
      if (error) {
        return console.error(error);
      }
      console.log('Connected to signaling server');
    });
    room.on('members', members => {
      if (members.length >= 3) {
        return alert('The room is full');
      }
      const isOfferer = members.length === 2;
      startWebRTC(isOfferer);
    });
  });
  
  function sendSignalingMessage(message) {
    drone.publish({
      room: roomName,
      message
    });
  }
  
  function startWebRTC(isOfferer) {
    console.log('Starting WebRTC in as', isOfferer ? 'offerer' : 'waiter');
    pc = new RTCPeerConnection(configuration);
  
    pc.onicecandidate = event => {
      if (event.candidate) {
        sendSignalingMessage({'candidate': event.candidate});
      }
    };
  
  
    if (isOfferer) {
     
      pc.onnegotiationneeded = () => {
        pc.createOffer(localDescCreated, error => console.error(error));
      }
      dataChannel = pc.createDataChannel('chat');
      setupDataChannel();
    } else {
    
      pc.ondatachannel = event => {
        dataChannel = event.channel;
        setupDataChannel();
      }
    }
  
    startListentingToSignals();
  }
  
  function startListentingToSignals() {
 
    room.on('data', (message, client) => {
    
      if (client.id === drone.clientId) {
        return;
      }
      if (message.sdp) {
       
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
          console.log('pc.remoteDescription.type', pc.remoteDescription.type);
        
          if (pc.remoteDescription.type === 'offer') {
            console.log('Answering offer');
            pc.createAnswer(localDescCreated, error => console.error(error));
          }
        }, error => console.error(error));
      } else if (message.candidate) {
       
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    });
  }
  
  function localDescCreated(desc) {
    pc.setLocalDescription(
      desc,
      () => sendSignalingMessage({'sdp': pc.localDescription}),
      error => console.error(error)
    );
  }
  
 
  function setupDataChannel() {
    checkDataChannelState();
    dataChannel.onopen = checkDataChannelState;
    dataChannel.onclose = checkDataChannelState;
    dataChannel.onmessage = event =>
        addMessageToDom({...JSON.parse(event.data),  fromMe: false})
  }
  
  function checkDataChannelState() {
    console.log('WebRTC channel state is:', dataChannel.readyState);
    if (dataChannel.readyState === 'open') {
        addMessageToDom({text: 'Подключено', nickname: "CONSOLE", emoji})
   
    }
  }
  
  function insertMessageToDOM(options, isFromMe) {
    const template = document.querySelector('template[data-template="message"]');
    const nameEl = template.content.querySelector('.message__name');
    if (options.emoji || options.name) {
      nameEl.innerText = options.emoji + ' ' + options.name;
    }
    template.content.querySelector('.message__bubble').innerText = options.content;
    const clone = document.importNode(template.content, true);
    const messageEl = clone.querySelector('.message');
    if (isFromMe) {
      messageEl.classList.add('message--mine');
    } else {
      messageEl.classList.add('message--theirs');
    }
  
    const messagesEl = document.querySelector('.messages');
    messagesEl.appendChild(clone);
  
    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight - messagesEl.clientHeight;
  }
  
 
function addMessageToDom(message) {

   

    let msg = document.createElement("div")
    msg.classList.add("message")
    if (message.fromMe) {
        msg.classList.add("msg_me")
    } else {
        msg.classList.add("msg_from")
    }
    let msgNick = document.createElement("div")
    let msgText = document.createElement("div")

    msgNick.classList.add("nickname")
    msgText.classList.add("message_text")

    if (message.isHTML) {
        
    msgText.innerHTML = message.text

    } else{

        msgText.textContent = message.text
    }

    msgNick.textContent = message.nickname + message.emoji

    msg.appendChild(msgNick)
    msg.appendChild(msgText)

    chatBody.appendChild(msg)

    window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
}

function send() {
    const data = {
        nickname: window.nickname,
        text: messageValue.value,
        emoji,
      };
    
      dataChannel.send(JSON.stringify(data));
    addMessageToDom({fromMe: true, text: messageValue.value, nickname: window.nickname, emoji})
}
  addMessageToDom({text: `<div onclick="copy()">Передай ссылку другу ${location.href} <div class="copy">Нажми чтобы скопировать</div></div>`, nickname: "CONSOLE", emoji, isHTML: true})

  function copy() {
    navigator.clipboard.writeText(location.href).then(function() {
        addMessageToDom({text: `Скопированно!`, nickname: "CONSOLE", emoji, isHTML: false})
      }, function(err) {
        addMessageToDom({text: `Ошибка! ${err.message}`, nickname: "CONSOLE", emoji, isHTML: false})
      });
  }