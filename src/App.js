import "./App.css";
import { useEffect, useRef } from "react";

import io from "socket.io-client";

const socket = io("https://5f98-103-14-145-129.in.ngrok.io/remote-ctrl");
// const socket = io(`${process.env.S_U}/remote-ctrl`)
console.log(socket);

function App() {
  const videoRef = useRef();

  // Establishing Webrtc Connection

  const rtcPeerConnection = useRef(
    new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    })
  );

  const handleStream = (stream) => {
    // const { width, height } = stream.getVideoTracks()[0].getSettings()

    // window.electronAPI.setSize({ width, height })

    // Stream Assigning to Src object
    // videoRef.current.srcObject = stream
    // videoRef.current.onloadedmetadata = (e) => videoRef.current.play()

    rtcPeerConnection.current.addStream(stream);
  };
  const getUserMedia = async (constraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // rtcPeerConnection.current.addTransceiver('video')
      // rtcPeerConnection.current.getTransceivers().forEach(t => t.direction = 'recvonly')

      rtcPeerConnection.current
        .createOffer({
          offerToReceiveVideo: 1,
        })
        .then((sdp) => {
          rtcPeerConnection.current.setLocalDescription(sdp);
          console.log("sending offer");
          socket.emit("offer", sdp);
        });
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    const getStream = async (screenId) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: screenId,
            },
          },
        });

        handleStream(stream);
      } catch (e) {
        console.log(e);
      }
    };

    (window.electronAPI &&
      window.electronAPI.getScreenId((event, screenId) => {
        console.log("Renderer...", screenId);
        getStream(screenId);
      })) ||
      getUserMedia({ video: true, audio: false });

    socket.on("offer", (offerSDP) => {
      console.log("received offer");
      rtcPeerConnection.current
        .setRemoteDescription(new RTCSessionDescription(offerSDP))
        .then(() => {
          rtcPeerConnection.current.createAnswer().then((sdp) => {
            rtcPeerConnection.current.setLocalDescription(sdp);

            console.log("sending answer");
            socket.emit("answer", sdp);
          });
        });
    });

    socket.on("answer", (answerSDP) => {
      console.log("received answer");
      rtcPeerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answerSDP)
      );
    });

    socket.on("icecandidate", (icecandidate) => {
      rtcPeerConnection.current.addIceCandidate(
        new RTCIceCandidate(icecandidate)
      );
    });
    rtcPeerConnection.current.onicecandidate = (e) => {
      if (e.candidate) socket.emit("icecandidate", e.candidate);
    };
    rtcPeerConnection.current.oniceconnectionstatechange = (e) => {
      console.log(e);
    };
    rtcPeerConnection.current.ontrack = (e) => {
      videoRef.current.srcObject = e.streams[0];
      //on play when metadata loaded
      videoRef.current.onloadedmetadata = (e) => videoRef.current.play();
    };
  }, []);

  return (
    <div className="App">
      <>
        <span>800x600</span>
        <video ref={videoRef} className="video">
          video not available
        </video>
      </>
    </div>
  );
}

export default App;
