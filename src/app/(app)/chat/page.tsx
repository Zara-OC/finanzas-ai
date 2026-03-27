import { Header } from "@/modules/shared/components/Header";
import { ChatWindow } from "@/modules/chat/components/ChatWindow";

export default function ChatPage() {
  return (
    <>
      <Header title="Chat" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <ChatWindow />
      </div>
    </>
  );
}
