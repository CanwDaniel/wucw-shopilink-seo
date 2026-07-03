import { useChat } from "@ai-sdk/react";
import { ArrowUpIcon, MessageCircleDashedIcon, RotateCwIcon } from "lucide-react";
import { createChat, getMessageText } from "~/lib/ai";
import { MessageAnimated } from "~/components/message-animated";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Controller, useForm } from "react-hook-form";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "~/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "~/components/ui/input-group";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "~/components/ui/tooltip";

const chat = createChat()
  .user(
    "I'm building a chat for our app and the scroll behavior is driving me nuts. Every time the AI streams a reply, the whole thread jumps around.",
  )
  .sleep(1000)
  .assistant(
    "That's the classic streaming scroll problem. Wrap your message list in `MessageScroller` and turn on `autoScroll` — the viewport pins to the bottom as tokens arrive, so users always see the latest text land in place.\n\nThe important part: it only auto-scrolls while the reader is already at the bottom. The moment they scroll up to read something earlier, auto-scroll backs off and their position is preserved. You get smooth streaming without fighting the user's intent.",
  )
  .user(
    "Okay, but when someone sends a new message the view still feels jarring — like the whole conversation reloads from the top.",
  )
  .sleep(1000)
  .assistant(
    "MessageScrollerItem fixes that with turn anchoring. Set `scrollAnchor` on the turn that should settle near the top instead of blindly snapping to the document bottom.\n\nIt also leaves a small peek of the previous exchange visible above the anchor, so context isn't lost. The reply starts in view without that disorienting jump you get from a plain overflow container.",
  )
  .user(
    "And if they've scrolled up to re-read an older answer? I don't want to yank them back down.",
  )
  .sleep(1000)
  .assistant(
    "You won't. Auto-scroll only runs when the viewport is already pinned to the bottom, so scrolling up is a deliberate opt-out — their place in the thread stays put even as new tokens keep arriving below.\n\nWhen there is content they haven't seen yet, `MessageScrollerButton` appears at the bottom of the viewport. One tap jumps them back to the newest message and re-engages auto-scroll. Same pattern as Slack or iMessage: quiet when you're caught up, helpful when you're not.",
  )
  .user("Last one — does this work with assistive tech?")
  .sleep(1000)
  .assistant(
    '`MessageScrollerContent` sets `role="log"` and `aria-relevant="additions"` by default, so screen readers announce new messages as they stream in.\n\nThe scroll button is a real `<button>` with an sr-only label, and it\'s removed from the tab order when you\'re already at the bottom — no ghost focus stops.',
  );

const initialMessages = chat.get({ count: 0 });

const transport = chat.transport({ chunkDelayMs: 20 });

export default function AiChatUi() {
  const form = useForm({
    defaultValues: { nextMessage: "" },
  });
  const { messages, sendMessage, status, setMessages } = useChat({ messages: [], transport });
  const nextMessage = chat.next({ after: messages });
  const isBusy = status === "submitted" || status === "streaming";

  function submitMessage(data: any) {
    if(!data.nextMessage || isBusy) return;
    sendMessage({ text: data.nextMessage });
    form.reset();
  }

  return (
    <MessageScrollerProvider autoScroll>
      <div className="relative flex flex-col gap-4">
        <Card className="h-180 w-lg">
          <CardHeader className="gap-1 border-b">
            <CardTitle>New Chat</CardTitle>
            <CardDescription>How can I help you today?</CardDescription>
            <CardAction>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Reset conversation"
                      onClick={() => setMessages(initialMessages)}
                      disabled={isBusy}
                      className="cursor-pointer"
                    >
                      <RotateCwIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardAction>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden pl-4 pr-2">
            {messages.length === 0 ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageCircleDashedIcon />
                  </EmptyMedia>

                  <EmptyDescription>
                    What are we working on today? Press send to start a new
                    conversation
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <MessageScroller>
                <MessageScrollerViewport className="pr-2">
                  <MessageScrollerContent
                    aria-busy={isBusy}
                    className="p-(--card-spacing)"
                  >
                    {messages.map((message) => (
                      <MessageAnimated
                        key={message.id}
                        message={message}
                        scrollAnchor={message.role === "user"}
                      />
                    ))}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton className="cursor-pointer"/>
              </MessageScroller>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-2">
            {/* <form onSubmit={(e) => {
              e.preventDefault();
              if (!nextMessage || isBusy) {
                return;
              }
              void sendMessage(nextMessage);
            }}
              className="w-full"
            > */}
            <form onSubmit={form.handleSubmit(submitMessage)} className="w-full">
              <InputGroup>
                <Controller name="nextMessage" control={form.control} render={({field, fieldState}) => {
                    return (
                      <Textarea
                        {...field}
                        id="form-nextMessage"
                        aria-invalid={fieldState.invalid}
                        placeholder="Ask me anything"
                        autoComplete="off"
                        className="flex-1 resize-none border-none focus:ring-0 focus-visible:ring-0 min-h-24"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && field.value && !isBusy) {
                            e.preventDefault();
                            console.log("submit", field.value);
                            submitMessage({ nextMessage: field.value });
                          }
                        }}
                      />
                    )
                  }}
                />
                
                {/* <div className="h-14 w-full px-3 py-2.5">
                  <span
                    className="line-clamp-2 opacity-60 data-[status=ready]:opacity-100"
                    data-status={status}
                  >
                    {nextMessage ? (getMessageText(nextMessage)) : (
                      <span className="text-muted-foreground">
                        No messages queued. Reset the conversation.
                      </span>
                    )}
                  </span>
                </div> */}
                
                <InputGroupAddon align="block-end" className="pt-1 w-auto absolute right-0 bottom-0">
                  <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    // disabled={!nextMessage || isBusy}
                    disabled={isBusy}
                    className="ml-auto cursor-pointer"
                  >
                    <ArrowUpIcon />
                    <span className="sr-only">Send</span>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          </CardFooter>
        </Card>
      </div>
    </MessageScrollerProvider>
  );
}
