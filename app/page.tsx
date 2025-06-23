"use client"
import { useEffect, useState } from "react"
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
import { Mail, Shield, Send, LogOut, Lock, Unlock, MessageCircle, User, CheckCircle2 } from "lucide-react"
import { UploadImage } from "@/components/upload-image"

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


  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const parsed = JSON.parse(savedUser)
      setUser(parsed)
      setEmail(parsed.email)
      setStep("chat")
      loadMessages(parsed.email)
    }
  }, [])

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
      setUser(res.data.user)
      localStorage.setItem("user", JSON.stringify(res.data.user))
      setStep("chat")
      loadMessages(res.data.user.email)
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
      await axios.post(`${BACKEND_URL}/api/chat/send`, {
        email: user.email,
        message: tempMessage,
      })
      socket.emit("newMessage")
    } catch (e) {
      toast.error("Gagal mengirim pesan")
      setMessage(tempMessage)
    }
  }

  const handleDecrypt = async (index: number, isImage = false) => {
    try {
      const m = messages[index];
      const res = await axios.post(`${BACKEND_URL}/api/chat/decrypt`, {
        email: user!.email,
        message: m.message,
      });
      const newMessages = [...messages];
      newMessages[index].decrypted = res.data.decrypted;
      newMessages[index].type = isImage ? 'image' : 'text';
      setMessages(newMessages);
      toast.success("Berhasil didekripsi!");
    } catch {
      toast.error("Gagal dekripsi");
    }
  };


  const loadMessages = async (currentEmail?: string) => {
    const userEmail = currentEmail || user?.email
    if (!userEmail) return

    try {
      const res = await axios.get(`${BACKEND_URL}/api/chat/all`, {
        params: { email: userEmail },
      })
      setMessages(res.data)
    } catch (e) {
      toast.error("Gagal memuat pesan")
    }
  }

  useEffect(() => {
    const handleNewMessage = () => {
      if (user?.email) loadMessages(user.email)
    }
    socket.on("newMessage", handleNewMessage)
    return () => {
      socket.off("newMessage", handleNewMessage)
    }
  }, [user])

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SecureChat</h1>
            <p className="text-gray-600">Pesan terenkripsi end-to-end</p>
          </div>

          {step === "register" && !user && (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Masuk atau Daftar
                </CardTitle>
                <CardDescription>Masukkan email untuk memulai chat aman</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="nama@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                    className="h-12 text-center border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={handleRegister}
                  disabled={isLoading || !email}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                >
                  {isLoading ? "Memproses..." : "Lanjutkan"}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "otp" && (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <Shield className="w-5 h-5 text-green-600" />
                  Verifikasi OTP
                </CardTitle>
                <CardDescription>
                  Kode verifikasi telah dikirim ke
                  <br />
                  <span className="font-medium text-gray-900">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Masukkan 6 digit kode OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleVerifyOtp)}
                    className="h-12 text-center text-lg tracking-widest border-gray-200 focus:border-green-500 focus:ring-green-500"
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium"
                >
                  {isLoading ? "Memverifikasi..." : "Verifikasi"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep("register")}
                  className="w-full text-gray-600 hover:text-gray-900"
                >
                  Kembali
                </Button>
              </CardContent>
            </Card>
          )}


          {step === "chat" && user && (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.email.split("@")[0]}</div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
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
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="p-0">
                <ScrollArea className="h-80 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Belum ada pesan</p>
                        <p className="text-sm">Mulai percakapan sekarang!</p>
                      </div>
                    ) : (
                      messages.map((m, i) => {
                        const isMe = m.sender === user?.email;
                        const isImage = m.type === 'image';
                        const decrypted = m.decrypted;

                        return (
                          <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`group relative max-w-[85%] ${isMe ? "order-2" : "order-1"}`}>
                              <div
                                className={`px-4 py-3 rounded-2xl shadow-sm ${isMe
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md"
                                  : "bg-gray-100 text-gray-900 rounded-bl-md"
                                  }`}
                              >
                                {!isMe && (
                                  <div className="text-xs font-medium mb-1 opacity-70">
                                    {m.sender.split("@")[0]}
                                  </div>
                                )}

                                

                                {!decrypted && (
                                  <Badge
                                    variant="secondary"
                                    className="mt-2 text-xs bg-yellow-100 text-yellow-800"
                                  >
                                    <Lock className="w-3 h-3 mr-1" />
                                    Terenkripsi
                                  </Badge>
                                )}
                              </div>

                              {!decrypted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDecrypt(i, isImage)}
                                  className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-700 h-6 px-2"
                                >
                                  {isImage ? '🔓 Dekripsi Gambar' : (<><Unlock className="w-3 h-3 mr-1" /> Dekripsi</>)}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <Separator />

                <div className="p-4">
                  <div className="flex gap-2 items-end">
                    <UploadImage user={user} onSuccess={() => loadMessages(user.email)} />
                    <Input
                      placeholder="Ketik pesan..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, handleSend)}
                      className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim()}
                      size="icon"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
