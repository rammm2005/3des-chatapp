"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import axios from "axios"
import { ImageIcon, Upload, X, FileImage, Loader2, Check, Paperclip, Camera } from "lucide-react"
import Image from "next/image"
import { base64Loader } from "@/utils/base64Loader"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

interface UploadImageProps {
    user: { email: string }
    onSuccess?: () => void
}

export function UploadImage({ user, onSuccess }: UploadImageProps) {
    const [image, setImage] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isDragOver, setIsDragOver] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const validateFile = (file: File): boolean => {
        const maxSize = 5 * 1024 * 1024 // 5MB
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]

        if (!allowedTypes.includes(file.type)) {
            toast.error("Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP")
            return false
        }

        if (file.size > maxSize) {
            toast.error("Ukuran file terlalu besar. Maksimal 5MB")
            return false
        }

        return true
    }

    const handleFileSelect = useCallback((file: File) => {
        if (!validateFile(file)) return

        setImage(file)

        const reader = new FileReader()
        reader.onload = (e) => {
            setPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelect(file)
            setIsDialogOpen(true)
        }
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)

            const files = e.dataTransfer.files
            if (files.length > 0) {
                handleFileSelect(files[0])
                setIsDialogOpen(true)
            }
        },
        [handleFileSelect],
    )

    const handleUpload = async () => {
        if (!image || !user) return

        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1]
            try {
                setIsUploading(true)
                setUploadProgress(0)

                const progressInterval = setInterval(() => {
                    setUploadProgress((prev) => {
                        if (prev >= 90) {
                            clearInterval(progressInterval)
                            return prev
                        }
                        return prev + 10
                    })
                }, 100)

                await axios.post(`${BACKEND_URL}/api/upload-image`, {
                    base64,
                    email: user.email,
                })

                clearInterval(progressInterval)
                setUploadProgress(100)

                setTimeout(() => {
                    toast.success("Gambar berhasil dikirim!")
                    setImage(null)
                    setPreview(null)
                    setUploadProgress(0)
                    setIsDialogOpen(false)
                    onSuccess?.()
                }, 500)
            } catch (error) {
                toast.error("Gagal mengirim gambar")
                setUploadProgress(0)
            } finally {
                setIsUploading(false)
            }
        }
        reader.readAsDataURL(image)
    }


    const clearSelection = () => {
        setImage(null)
        setPreview(null)
        setIsDialogOpen(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    return (
        <>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full h-10 w-10"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="w-5 h-5" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                            Kirim Gambar
                        </DialogTitle>
                    </DialogHeader>

                    {!image ? (
                        <Card
                            className={`border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 ${isDragOver ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-300 bg-gray-50/30"
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <CardContent className="p-8">
                                <div className="text-center space-y-4">
                                    <div
                                        className={`inline-flex items-center justify-center w-16 h-16 rounded-full transition-colors ${isDragOver ? "bg-blue-100" : "bg-gray-100"
                                            }`}
                                    >
                                        <ImageIcon
                                            className={`w-8 h-8 transition-colors ${isDragOver ? "text-blue-600" : "text-gray-500"}`}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-lg font-medium text-gray-900">
                                            {isDragOver ? "Lepas gambar di sini" : "Pilih gambar"}
                                        </p>
                                        <p className="text-sm text-gray-500">Drag & drop atau klik untuk memilih gambar</p>
                                    </div>

                                    <div className="flex gap-3 justify-center pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                fileInputRef.current?.click()
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            Galeri
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toast.info("Fitur kamera akan segera hadir!")
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Kamera
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                {preview && (
                                    <div className="relative w-full h-64 rounded-lg overflow-hidden shadow-sm">
                                        <Image
                                            loader={base64Loader}
                                            src={preview}
                                            alt="Preview"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                )}
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={clearSelection}
                                    className="absolute top-3 right-3 h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-0"
                                    disabled={isUploading}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>


                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <FileImage className="w-5 h-5 text-gray-500" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">{image.name}</div>
                                    <div className="text-sm text-gray-500">{formatFileSize(image.size)}</div>
                                </div>
                            </div>

                            {isUploading && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Mengirim gambar...</span>
                                        <span className="text-blue-600 font-medium">{uploadProgress}%</span>
                                    </div>
                                    <Progress value={uploadProgress} className="h-2" />
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-11"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : uploadProgress === 100 ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Terkirim!
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Kirim Gambar
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={clearSelection} disabled={isUploading} className="px-6 h-11">
                                    Batal
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </>
    )
}
