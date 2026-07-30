import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ROUTES } from "@/routes/config"

export default function FormA2CreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Buat Form A2</h1>
        <p className="mt-1 text-sm text-gray-500">
          Form A2 dibuat otomatis dari Form CR9 yang diajukan.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center text-center gap-4">
          <div className="space-y-1">
            <p className="font-medium text-gray-800">
              Form A2 dibuat otomatis saat Form CR9 diajukan
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              Untuk membuat Form A2, buat atau ajukan terlebih dahulu Form CR9.
              Setelah CR9 diajukan, Form A2 akan terbuat secara otomatis dan
              dapat dilengkapi oleh Admin SPM.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Button asChild variant="outline">
              <Link to={ROUTES.formA2.path}>Kembali ke Form A2</Link>
            </Button>
            <Button
              asChild
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Link to={ROUTES.formCr9.path}>Lihat Form CR9</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
