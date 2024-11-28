import cv2
from fer import FER

def detect_emotion():
    emotion_detector = FER(mtcnn=True)  # Initialize FER model
    cap = cv2.VideoCapture(0)           # Start webcam

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        emotions = emotion_detector.detect_emotions(frame)
        if emotions:
            # Get the top emotion with the highest score
            emotion, score = max(emotions[0]["emotions"].items(), key=lambda x: x[1])
            print(f"Detected emotion: {emotion} with score {score}")
            if emotion in ["angry", "fear", "sad"]:
                print("Developer may be stressed.")

        cv2.imshow("Emotion Detection", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

detect_emotion()
