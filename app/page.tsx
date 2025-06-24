"use client"
import { useCallback, useEffect, useState } from "react"
import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import axios from "axios"
import io from "socket.io-client"
import { toast } from "sonner"
import type { ChatMessage } from "@/types/chat"
import { Mail, Shield, Send, LogOut, Lock, Unlock, MessageCircle, User, CheckCircle2, ArrowLeft } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
const socket = io(BACKEND_URL)

export default function Home() {
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"register" | "otp" | "chat">("register")
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadMessages = useCallback(async (targetEmail: string) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/chat/all`, {
        params: { email: targetEmail },
      })
      setMessages(res.data)
    } catch (e) {
      toast.error("Gagal memuat pesan")
    }
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const parsed = JSON.parse(savedUser)
      setUser(parsed)
      setEmail(parsed.email)
      setStep("chat")
      loadMessages(parsed.email)
    }
  }, [loadMessages])

  const handleRegister = async () => {
    if (!email) return
    setIsLoading(true)
    try {
      await axios.post(`${BACKEND_URL}/api/register`, { email })
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal register")
    } finally {
      try {
        await axios.post(`${BACKEND_URL}/api/request-otp`, { email })
        setStep("otp")
        toast.success("OTP dikirim ke email!")
      } catch (e: any) {
        toast.error("Gagal mengirim OTP")
      }
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp) return
    setIsLoading(true)
    try {
      const res = await axios.post(`${BACKEND_URL}/api/verify-otp`, { email, otp })
      const loggedInUser = res.data.user
      setUser(loggedInUser)
      localStorage.setItem("user", JSON.stringify(loggedInUser))
      setStep("chat")
      loadMessages(loggedInUser.email)
      toast.success("Berhasil masuk!")
    } catch (e) {
      toast.error("OTP salah atau gagal verifikasi")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!user || !message.trim()) return
    const tempMessage = message
    setMessage("")

    try {
      const res = await axios.post(`${BACKEND_URL}/api/chat/send`, {
        email: user.email,
        message: tempMessage,
      })

      const newMsg: ChatMessage = {
        sender: user.email,
        message: "[Terenkripsi]",
        encryptDuration: res.data.encryptDuration,
      }

      console.log("🚀 New message:", newMsg)

      setMessages((prev) => [...prev, newMsg])

      setTimeout(() => {
        socket.emit("newMessage")
      }, 500)
    } catch (e) {
      toast.error("Gagal mengirim pesan")
      setMessage(tempMessage)
    }
  }


  const handleDecrypt = async (index: number) => {
    try {
      const m = messages[index]
      const res = await axios.post(`${BACKEND_URL}/api/chat/decrypt`, {
        email: user!.email,
        message: m.message,
      })

      const newMessages = [...messages]
      newMessages[index].decrypted = res.data.decrypted
      newMessages[index].decryptDuration = res.data.duration
      setMessages(newMessages)
      toast.success("Berhasil didekripsi!")
    } catch {
      toast.error("Gagal dekripsi")
    }
  }

  console.log("📦 Messages state:", messages)


  useEffect(() => {
    const handleNewMessage = () => {
      if (user?.email) {
        loadMessages(user.email)
      }
    }

    socket.on("newMessage", handleNewMessage)
    return () => {
      socket.off("newMessage", handleNewMessage)
    }
  }, [user?.email, loadMessages])

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full mb-6 shadow-2xl animate-bounce-slow">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-3">
              SecureChat
            </h1>
            <p className="text-gray-300 text-lg">Pesan terenkripsi end-to-end</p>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {step === "register" && !user && (
            <Card className="shadow-2xl border-0 bg-white/10 backdrop-blur-xl border-white/20 animate-slide-up">
              <CardHeader className="text-center pb-6">
                <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  Masuk atau Daftar
                </CardTitle>
                <CardDescription className="text-gray-300 text-base mt-2">
                  Masukkan email untuk memulai chat aman
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-8 pb-8">
                <div className="relative">
                  <Input
                    placeholder="nama@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                    className="h-14 text-center bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl text-lg backdrop-blur-sm"
                  />
                </div>
                <Button
                  onClick={handleRegister}
                  disabled={isLoading || !email}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-700 hover:via-pink-700 hover:to-cyan-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Memproses...
                    </div>
                  ) : (
                    "Lanjutkan"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "otp" && (
            <Card className="shadow-2xl border-0 bg-white/10 backdrop-blur-xl border-white/20 animate-slide-up">
              <CardHeader className="text-center pb-6">
                <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  Verifikasi OTP
                </CardTitle>
                <CardDescription className="text-gray-300 text-base mt-2">
                  Kode verifikasi telah dikirim ke
                  <br />
                  <span className="font-semibold text-white bg-white/10 px-3 py-1 rounded-lg mt-2 inline-block">
                    {email}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-8 pb-8">
                <div className="relative">
                  <Input
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleVerifyOtp)}
                    className="h-16 text-center text-2xl tracking-[0.5em] bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-sm font-mono"
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                  className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Memverifikasi...
                    </div>
                  ) : (
                    "Verifikasi"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep("register")}
                  className="w-full text-gray-300 hover:text-white hover:bg-white/10 rounded-xl h-12 transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "chat" && user && (
            <Card className="shadow-2xl border-0 bg-white/10 backdrop-blur-xl border-white/20 animate-slide-up">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                      <div className="font-semibold text-white text-lg">{user.email.split("@")[0]}</div>
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Online
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem("user")
                      setUser(null)
                      setEmail("")
                      setStep("register")
                      setMessages([])
                    }}
                    className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all duration-300"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>

              <Separator className="bg-white/20" />

              <CardContent className="p-0">
                <ScrollArea className="h-96 p-6">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 animate-fade-in">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageCircle className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium mb-2">Belum ada pesan</p>
                        <p className="text-sm">Mulai percakapan sekarang!</p>
                      </div>
                    ) : (
                      messages.map((m, i) => {
                        const isMe = m.sender === user?.email
                        const decrypted = m.decrypted

                        return (
                          <div
                            key={i}
                            className={`group relative max-w-[85%] ${isMe ? "order-2" : "order-1"}`}
                          >
                            <div
                              className={`px-4 py-3 w-fit max-w-full break-words whitespace-pre-wrap rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${isMe
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-md"
                                : "bg-white/20 text-white rounded-bl-md border border-white/20"
                                }`}
                            >
                              {!isMe && (
                                <div className="text-xs font-medium mb-2 text-gray-300">{m.sender.split("@")[0]}</div>
                              )}
                              {isMe && <div className="text-xs font-semibold mb-2 text-white/80">You</div>}

                              <div className="break-words whitespace-pre-wrap">
                                {!decrypted && (
                                  <div className="flex items-start gap-2">
                                    <Lock className="w-4 h-4 shrink-0 mt-1" />
                                    <span className="break-all">{m.message}</span>
                                  </div>
                                )}
                                {decrypted && (
                                  <div className="mt-1 break-words whitespace-pre-wrap break-all">{decrypted}</div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 mt-3">
                                {isMe && typeof m.encryptDuration !== "undefined" && (
                                  <Badge className="text-xs bg-white/20 text-white/80 hover:bg-white/30">
                                    ⚡ {m.encryptDuration}ms
                                  </Badge>
                                )}

                                {decrypted && m.decryptDuration && (
                                  <Badge className="text-xs bg-green-500/20 text-green-300 hover:bg-green-500/30">
                                    🔓 {m.decryptDuration}ms
                                  </Badge>
                                )}
                              </div>

                              {!decrypted && (
                                <div className="flex justify-between items-center mt-3">
                                  <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                    <Lock className="w-3 h-3 mr-1" />
                                    Terenkripsi
                                  </Badge>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDecrypt(i)}
                                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-xs h-6 px-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                                  >
                                    <Unlock className="w-3 h-3 mr-1" />
                                    Dekripsi
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>

                <Separator className="bg-white/20" />

                {/* Message Input */}
                <div className="p-6">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Ketik pesan..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, handleSend)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl h-12 pr-4 backdrop-blur-sm"
                      />
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim()}
                      size="icon"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 w-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div >
  )
}
