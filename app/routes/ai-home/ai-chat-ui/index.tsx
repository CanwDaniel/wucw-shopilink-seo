import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowUpIcon,
  MessageCircleDashedIcon,
  RotateCwIcon,
} from "lucide-react";
import { MessageAnimated } from "~/components/ui/message-animated";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Controller, useForm } from "react-hook-form";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
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

import { memo } from "react";

const CardItem = memo(({ data }) => {
  return data.map((part, partIdx) => {
    if (part?.type === "data-recommendation") {
      const recommendation = part.data?.recommendation || [];
      
      return (
        <div key={partIdx} className="flex justify-center">
          {
            Array.isArray(recommendation) && recommendation.length > 0 ? (
              <Carousel className="w-full max-w-48 sm:max-w-xs md:max-w-sm">
                <CarouselContent className="ml-0">
                  {recommendation.map((_, index) => (
                    <CarouselItem key={_.id} className="basis-1/3 p-1">
                      <div className="p-1">
                        <Card>
                          <CardContent className="flex aspect-square items-center justify-center p-2">
                            <CardDescription>{_.title}</CardDescription>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="cursor-pointer -left-10" />
                <CarouselNext className="cursor-pointer" />
              </Carousel>
            ) : recommendation ? (
              <div className="p-4 w-full text-sm text-muted-foreground leading-relaxed animate-fade-in">
                <p>{String(recommendation)}</p>
              </div>
            ) : null
          }
        </div>
      );
    }

    // 2. 如果 Shadcn 返回的是普通的 text 块，照常渲染
    if (part?.type === "text") {
      return (
        <div key={partIdx} className="text-sm bg-muted p-2 rounded">
          {part.text}{" "}
        </div>
      );
    }

    return null;
  });
});

const ProductCard = memo(({ data }) => {
  return (
    <div className="flex flex-col gap-4">
      {data.length !== 0 ? <CardItem data={data} /> : "暂无数据"}
    </div>
  );
});

const RecommendCard = memo(({ data }) => {
  return (
    <>
      {data.map((message: any) => (
        <div key={message.id}>
          {message.role === "assistant" ? (
            <ProductCard data={message.parts} />
          ) : (
            <MessageAnimated
              key={message.id}
              message={message}
              scrollAnchor={message.role === "user"}
              assistantVariant="ghost"
            />
          )}
        </div>
      ))}
    </>
  );
});

export default function AiChatUi() {
  const form = useForm({
    defaultValues: { nextMessage: "" },
  });

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/aichat",
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  function submitMessage(data: any) {
    if (!data.nextMessage.trim() || isBusy) return;
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
                      onClick={() => setMessages([])}
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
                    <RecommendCard data={messages} />
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton className="cursor-pointer" />
              </MessageScroller>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-2">
            <form
              onSubmit={form.handleSubmit(submitMessage)}
              className="w-full"
            >
              <InputGroup>
                <Controller
                  name="nextMessage"
                  control={form.control}
                  render={({ field, fieldState }) => {
                    return (
                      <Textarea
                        {...field}
                        id="form-nextMessage"
                        aria-invalid={fieldState.invalid}
                        placeholder="Ask me anything"
                        autoComplete="off"
                        className="flex-1 resize-none border-none focus:ring-0 focus-visible:ring-0 min-h-24"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            field.value &&
                            !isBusy
                          ) {
                            e.preventDefault();
                            submitMessage({ nextMessage: field.value });
                          }
                        }}
                      />
                    );
                  }}
                />

                <InputGroupAddon
                  align="block-end"
                  className="pt-1 w-auto absolute right-0 bottom-0"
                >
                  <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
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
