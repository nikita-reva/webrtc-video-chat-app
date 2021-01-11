const socket = io()

const videoChatLobby = document.getElementById('video-chat-lobby')
const videoChatRoom = document.getElementById('video-chat-room')
const joinButton = document.getElementById('join')
const userVideo = document.getElementById('user-video')
const peerVideo = document.getElementById('peer-video')
const roomInput = document.getElementById('room-name')
const roomDisplay = document.getElementById('room-display')
let roomName
let creator = false
let rtcPeerConnection
let userStream

// Contains the stun server URL we will be using.
const iceServers = {
	iceServers: [
		{ urls: 'stun:stun.services.mozilla.com' },
		{ urls: 'stun:stun2.l.google.com:19302' },
	],
}

joinButton.addEventListener('click', function () {
	roomName = roomInput.value
	if (roomName === '') {
		alert('Please enter a room name')
	} else {
		roomDisplay.innerText = 'Room: ' + roomName
		socket.emit('join', roomName)
	}
})

// Triggered when a room is succesfully created.
socket.on('created', function () {
	creator = true
	getUserMedia()
})

// Triggered when a room is succesfully joined.

socket.on('joined', function () {
	creator = false
	getUserMedia()
})

// Triggered when a room is full (meaning has 2 people).

socket.on('full', function () {
	alert("Room is full - can't join")
})

// Triggered when a peer has joined the room and ready to communicate.

socket.on('ready', function () {
	if (creator) {
		rtcPeerConnection = new RTCPeerConnection(iceServers)
		rtcPeerConnection.onicecandidate = onIceCandidateFunction
		rtcPeerConnection.ontrack = onTrackFunction
		rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream)
		rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream)
		rtcPeerConnection.createOffer(
			function (offer) {
				rtcPeerConnection.setLocalDescription(offer)
				socket.emit('offer', offer, roomName)
			},
			function (error) {
				console.log(error)
			}
		)
	}
})

// Triggered on receiving an ice candidate from the peer.

socket.on('candidate', function (candidate) {
	let icecandidate = new RTCIceCandidate(candidate)
	rtcPeerConnection.addIceCandidate(icecandidate)
})

// Triggered on receiving an offer from the person who created the room.

socket.on('offer', function (offer) {
	if (!creator) {
		rtcPeerConnection = new RTCPeerConnection(iceServers)
		rtcPeerConnection.onicecandidate = onIceCandidateFunction
		rtcPeerConnection.ontrack = onTrackFunction
		rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream)
		rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream)
		rtcPeerConnection.setRemoteDescription(offer)
		rtcPeerConnection.createAnswer(
			function (answer) {
				rtcPeerConnection.setLocalDescription(answer)
				socket.emit('answer', answer, roomName)
			},
			function (error) {
				console.log(error)
			}
		)
	}
})

// Triggered on receiving an answer from the person who joined the room.

socket.on('answer', function (answer) {
	rtcPeerConnection.setRemoteDescription(answer)
})

///////////////////////////////////////////////////
// Functions

function getUserMedia() {
	const constraints = { audio: true, video: { width: 500, height: 500 } }
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(function (mediaStream) {
			userStream = mediaStream
			videoChatLobby.style.display = 'none'
			userVideo.srcObject = mediaStream
			userVideo.onloadedmetadata = function (e) {
				userVideo.play()
			}
			socket.emit('ready', roomName)
		})
		.catch(function (err) {
			alert('Cannot access user media')
			console.log(err.name + ': ' + err.message)
		})
}

// Implementing the OnIceCandidateFunction which is part of the RTCPeerConnection Interface.

function onIceCandidateFunction(event) {
	if (event.candidate) {
		socket.emit('candidate', event.candidate, roomName)
	}
}

// Implementing the OnTrackFunction which is part of the RTCPeerConnection Interface.

function onTrackFunction(event) {
	userVideo.classList.add('connected')
	peerVideo.style.display = 'block'
	peerVideo.srcObject = event.streams[0]
	peerVideo.onloadedmetadata = function (e) {
		peerVideo.play()
	}
}
