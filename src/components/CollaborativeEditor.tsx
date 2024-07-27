import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { useCallback, useEffect, useRef, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// Collaborative text editor with simple rich text, live cursors, and live avatars
export function CollaborativeEditor() {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  // Set up Liveblocks Yjs provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    setDoc(yDoc);
    setProvider(yProvider);

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [room]);

  if (!doc || !provider) {
    return null;
  }

  return <BlockNote doc={doc} provider={provider} />;
}

type EditorProps = {
  doc: Y.Doc;
  provider: any;
};

function BlockNote({ doc, provider }: EditorProps) {
  // Get user info from Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);

  const editor: BlockNoteEditor = useCreateBlockNote({
    collaboration: {
      provider,

      // Where to store BlockNote data in the Y.Doc:
      fragment: doc.getXmlFragment("document-store"),

      // Information for this user:
      user: {
        name: "",
        color: "blue",
      },
    },
  });

  const speechConfig = useRef<sdk.SpeechConfig | null>(null);
  const audioConfig = useRef<sdk.AudioConfig | null>(null);
  const recognizer = useRef<sdk.SpeechRecognizer | null>(null);
  const [recognizingTranscript, setRecTranscript] = useState("");
  const [allText, setAllText] = useState("");
  const [textForInsert, setTextForInsert] = useState("");
  const SPEECH_KEY = process.env.NEXT_PUBLIC_SPEECH_KEY;
  const SPEECH_REGION = process.env.NEXT_PUBLIC_SPEECH_REGION;

  useEffect(() => {
    if (!SPEECH_KEY || !SPEECH_REGION) {
      console.error("Speech key and region must be provided.");
      return;
    }
    speechConfig.current = sdk.SpeechConfig.fromSubscription(
      SPEECH_KEY,
      SPEECH_REGION
    );
    speechConfig.current.speechRecognitionLanguage = "ja-JP";
    audioConfig.current = sdk.AudioConfig.fromDefaultMicrophoneInput();
    recognizer.current = new sdk.SpeechRecognizer(
      speechConfig.current,
      audioConfig.current
    );
    const processRecognizedTranscript = (
      event: sdk.SpeechRecognitionEventArgs
    ) => {
      const result = event.result;
      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        const transcript = result.text;
        setAllText((prev) => {
          if (prev === "") return transcript;
          return prev + "\n" + transcript;
        });

        setTextForInsert(transcript);

        setRecTranscript("");
      }
    };
    const processRecognizingTranscript = (
      event: sdk.SpeechRecognitionEventArgs
    ) => {
      const result = event.result;
      if (result.reason === sdk.ResultReason.RecognizingSpeech) {
        const transcript = result.text;
        setRecTranscript(transcript);
      }
    };
    if (recognizer.current) {
      recognizer.current.recognized = (
        s: sdk.Recognizer,
        e: sdk.SpeechRecognitionEventArgs
      ) => processRecognizedTranscript(e);
      recognizer.current.recognizing = (
        s: sdk.Recognizer,
        e: sdk.SpeechRecognitionEventArgs
      ) => processRecognizingTranscript(e);
      recognizer.current.startContinuousRecognitionAsync(() => {});
      return () => {
        recognizer.current?.stopContinuousRecognitionAsync(() => {});
      };
    }
  }, []);

  const resumeListening = () => {
    recognizer.current?.startContinuousRecognitionAsync(() => {});
  };

  const [theme, setTheme] = useState<"light" | "dark">("light");

  const changeTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    setTheme(newTheme);
  }, [theme]);

  useEffect(() => {
    const insertBlocks = async () => {
      const blocks = editor.document;
      const insertBlock = await editor.tryParseMarkdownToBlocks(textForInsert);
      const id = blocks.at(-1)?.id;
      if (id) {
        editor.insertBlocks(insertBlock, id);
      } else {
        editor.replaceBlocks(editor.document, insertBlock);
      }
    };

    insertBlocks();
  }, [textForInsert]);

  return (
    <div>
      <BlockNoteView editor={editor} theme={theme} />
      <div>{recognizingTranscript}</div>
      <button onClick={resumeListening}>start</button>
    </div>
  );
}
