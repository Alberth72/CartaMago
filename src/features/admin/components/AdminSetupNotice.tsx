import { Settings } from 'lucide-react'
import { AdminShell } from './AdminShell'

export function AdminSetupNotice() {
  return (
    <AdminShell title="Admin" subtitle="Conecta Supabase para activar el panel del restaurante">
      <div className="mx-auto mt-8 max-w-3xl rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-900">
            <Settings size={20} />
          </span>
          <div>
            <h2 className="text-xl font-black">Admin listo para configurar</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Para que el dueno cambie productos e imagenes y el QR publico se actualice para todos, configura Supabase
              y estas variables en Netlify.
            </p>
          </div>
        </div>
        <pre className="mt-5 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm text-stone-50">
{`VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
VITE_BRANCH_ID=brasas-sazon
VITE_MENU_STORAGE_BUCKET=menu-assets`}
        </pre>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          El SQL base esta documentado en <code>docs/supabase-admin-setup.md</code>. Mientras Supabase no exista, el menu
          publico sigue funcionando con la semilla del MVP.
        </p>
      </div>
    </AdminShell>
  )
}
