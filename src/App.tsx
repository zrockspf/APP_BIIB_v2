import { useState, useEffect, useMemo } from "react";

// --- INTERFACES DE CONTROL DE TIPOS (TypeScript) ---
interface Remision {
  folio: string;
  fechaRecibido: string;
  fechaEntrega: string;
  cliente: string;
  celular: string;
  trabajo: string;
  cantidadPiezas: number;
  total: number;
  anticipo: number;
  saldo: number;
  estado: string;
  foto: string;
  metodoPagoAnticipo?: MetodoPago;
  metodoPagoLiquidacion?: MetodoPago;
}

type MetodoPago = "Efectivo" | "Transferencia";

interface Gasto {
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
  metodoPago?: MetodoPago;
}

interface Movimiento {
  fecha: string;
  tipoMovimiento: string;
  monto: number;
  metodoPago?: MetodoPago;
}

interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  costo: number;
  activo: boolean;
}

interface ConfiguracionNegocio {
  sueldoBibi: number;
  sueldoSalvador: number;
  sueldoSuni: number;
  renta: number;
  auto: number;
  internet: number;
  diasTrabajo: number;
}

// Base de datos local de usuarios con sus respectivos roles
const usuarios = [
  { usuario: "Bibi", password: "Bibi01", rol: "admin" },
  { usuario: "Salvador", password: "Salvador01", rol: "admin" },
  { usuario: "Suni", password: "123456", rol: "vendedor" },
];

const configuracionInicial: ConfiguracionNegocio = {
  sueldoBibi: 18000,
  sueldoSalvador: 13000,
  sueldoSuni: 13000,
  renta: 11000,
  auto: 13000,
  internet: 400,
  diasTrabajo: 26,
};

const normalizarFecha = (valor: unknown): string => {
  if (!valor) return "";

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, "0")}-${String(valor.getDate()).padStart(2, "0")}`;
  }

  const texto = String(valor).trim();
  if (!texto) return "";

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const latino = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (latino) {
    return `${latino[3]}-${latino[2].padStart(2, "0")}-${latino[1].padStart(2, "0")}`;
  }

  const fecha = new Date(texto);
  if (!Number.isNaN(fecha.getTime())) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  return texto;
};

const conceptosGastoIniciales = [
  "Oro",
  "Plata",
  "Plateado",
  "Broches",
  "Soldadura",
  "Seguetas",
  "Herramientas taller",
  "Gasolina",
  "Renta",
  "Internet",
  "Auto",
  "Papelería",
  "Publicidad",
  "Estacionamiento",
  "Otro",
];



const serviciosIniciales: Servicio[] = [
  { id: "cambio-broche", nombre: "Cambio de broche", precio: 65, costo: 20, activo: true },
  { id: "punto-soldadura", nombre: "Punto de soldadura", precio: 50, costo: 5, activo: true },
  { id: "sobrepuestas", nombre: "Sobrepuestas", precio: 220, costo: 100, activo: true },
  { id: "grabado", nombre: "Grabado", precio: 70, costo: 30, activo: true },
  { id: "dijes", nombre: "Dijes", precio: 260, costo: 100, activo: true },
  { id: "cambio-terminal", nombre: "Cambio de terminal", precio: 0, costo: 0, activo: true },
];

// Enlace único de Google Apps Script
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbxJnXRcX0VxxM6AlU1yhW450cnhlyZ1DCre-jqvHNimFcO9bNjZoP-PaKaVppkbj3b93A/exec";

export default function TallerJoyeroApp() {
  // --- ESTADOS DE SESIÓN Y CONTROL ---
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [sesionIniciada, setSesionIniciada] = useState(false);
  const [rol, setRol] = useState("vendedor");
  const [vistaAdmin, setVistaAdmin] = useState("dashboard");
  const [cargando, setCargando] = useState(false);

  // --- ESTADOS FORMULARIO NUEVA REMISIÓN ---
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const [fechaRecibido, setFechaRecibido] = useState(today);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");
  const [trabajo, setTrabajo] = useState("");
  const [cantidadPiezas, setCantidadPiezas] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [metodoPagoAnticipo, setMetodoPagoAnticipo] = useState<MetodoPago>("Efectivo");
  const [total, setTotal] = useState("");
  const [estado, setEstado] = useState("en proceso");
  const [fotoPieza, setFotoPieza] = useState("");
  
  const [fileInputKey, setFileInputKey] = useState(0);

  // --- ESTADOS FORMULARIO GASTOS ---
  const [conceptosGasto, setConceptosGasto] = useState<string[]>(() => {
    const guardados = localStorage.getItem("taller_conceptos_gasto");
    return guardados ? JSON.parse(guardados) : conceptosGastoIniciales;
  });
  const [conceptoGasto, setConceptoGasto] = useState<string>("Oro");
  const [otroConceptoGasto, setOtroConceptoGasto] = useState("");
  const [montoGasto, setMontoGasto] = useState("");
  const [metodoPagoGasto, setMetodoPagoGasto] = useState<MetodoPago>("Efectivo");

  // --- LIQUIDACIÓN AL ENTREGAR ---
  const [entregaPendiente, setEntregaPendiente] = useState<Remision | null>(null);
  const [metodoPagoEntrega, setMetodoPagoEntrega] = useState<MetodoPago>("Efectivo");

  // --- HISTORIALES ---
  const [ultimasRemisiones, setUltimasRemisiones] = useState<Remision[]>(() => {
    const guardadas = localStorage.getItem("taller_remisiones");
    return guardadas ? JSON.parse(guardadas) : [];
  });

  const [historialGastos, setHistorialGastos] = useState<Gasto[]>(() => {
    const guardados = localStorage.getItem("taller_gastos");
    return guardados ? JSON.parse(guardados) : [];
  });

  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => {
    const guardados = localStorage.getItem("taller_movimientos");
    return guardados ? JSON.parse(guardados) : [];
  });

  const [servicios, setServicios] = useState<Servicio[]>(() => {
    const guardados = localStorage.getItem("taller_servicios");
    return guardados ? JSON.parse(guardados) : serviciosIniciales;
  });

  const [servicioSeleccionado, setServicioSeleccionado] = useState("");

  const [configuracion, setConfiguracion] = useState<ConfiguracionNegocio>(() => {
    const guardada = localStorage.getItem("taller_configuracion");
    return guardada ? { ...configuracionInicial, ...JSON.parse(guardada) } : configuracionInicial;
  });

  // --- EFECTO DE DESCARGA MULTIDISPOSITIVO ---
  useEffect(() => {
    if (sesionIniciada) {
      cargarDatosDesdeNube();
    }
  }, [sesionIniciada]);

  const cargarDatosDesdeNube = async () => {
    setCargando(true);
    try {
      const respuesta = await fetch(`${URL_GOOGLE_SCRIPT}?accion=sincronizar_completo&_=${Date.now()}`);
      if (!respuesta.ok) throw new Error("No se pudo consultar Google Sheets");
      const datosNube = await respuesta.json();

      // Compatibilidad con la versión anterior del Apps Script, que devolvía solo remisiones.
      if (Array.isArray(datosNube)) {
        setUltimasRemisiones(datosNube);
        localStorage.setItem("taller_remisiones", JSON.stringify(datosNube));
        return;
      }

      if (Array.isArray(datosNube.remisiones)) {
        const remisionesNormalizadas: Remision[] = datosNube.remisiones.map((r: any) => ({
          folio: String(r.folio || ""),
          fechaRecibido: String(r.fechaRecibido || ""),
          fechaEntrega: String(r.fechaEntrega || ""),
          cliente: String(r.cliente || ""),
          celular: String(r.celular || ""),
          trabajo: String(r.trabajo || ""),
          cantidadPiezas: Number(r.cantidadPiezas || 0),
          total: Number(r.total || 0),
          anticipo: Number(r.anticipoOriginal ?? r.anticipo ?? 0),
          saldo: Number(r.saldo || 0),
          estado: String(r.estado || "En Proceso"),
          foto: String(r.fotoURL || r.foto || ""),
        }));
        setUltimasRemisiones(remisionesNormalizadas);
        localStorage.setItem("taller_remisiones", JSON.stringify(remisionesNormalizadas));
      }

      if (Array.isArray(datosNube.gastos)) {
        const gastosNormalizados: Gasto[] = datosNube.gastos.map((g: any) => ({
          fecha: String(g.fecha || ""),
          concepto: String(g.concepto === "Otro" ? (g.conceptoOtro || "Otro") : (g.concepto || "")),
          categoria: String(g.categoriaInterna || g.categoria || "Otros"),
          monto: Number(g.monto || 0),
          metodoPago: (g.metodoPago || "Efectivo") as MetodoPago,
        }));
        setHistorialGastos(gastosNormalizados);
        localStorage.setItem("taller_gastos", JSON.stringify(gastosNormalizados));
      }

      if (Array.isArray(datosNube.movimientos)) {
        const movimientosNormalizados: Movimiento[] = datosNube.movimientos.map((m: any) => ({
          fecha: String(m.fecha || ""),
          tipoMovimiento: String(m.tipoMovimiento || ""),
          monto: Number(m.monto || 0),
          metodoPago: (m.metodoPago || "Efectivo") as MetodoPago,
        }));
        setMovimientos(movimientosNormalizados);
        localStorage.setItem("taller_movimientos", JSON.stringify(movimientosNormalizados));
      }

      if (Array.isArray(datosNube.servicios)) {
        const serviciosNormalizados: Servicio[] = datosNube.servicios.map((srv: any) => ({
          id: String(srv.id || srv.nombreServicio || ""),
          nombre: String(srv.nombreServicio || srv.nombre || ""),
          precio: Number(srv.precioVenta ?? srv.precio ?? 0),
          costo: Number(srv.costoMaterial ?? srv.costo ?? 0),
          activo: srv.activo !== false,
        }));
        setServicios(serviciosNormalizados);
        localStorage.setItem("taller_servicios", JSON.stringify(serviciosNormalizados));
      }

      if (datosNube.catalogos && typeof datosNube.catalogos === "object") {
        const conceptosNube = Array.isArray(datosNube.catalogos.conceptosGasto)
          ? datosNube.catalogos.conceptosGasto.map((item: unknown) => String(item).trim()).filter(Boolean)
          : [];
        if (conceptosNube.length > 0) {
          const conceptosConOtro = conceptosNube.includes("Otro") ? conceptosNube : [...conceptosNube, "Otro"];
          setConceptosGasto(conceptosConOtro);
          localStorage.setItem("taller_conceptos_gasto", JSON.stringify(conceptosConOtro));
          if (!conceptosConOtro.includes(conceptoGasto)) setConceptoGasto(conceptosConOtro[0]);
        }
      }

      if (datosNube.configuracion && typeof datosNube.configuracion === "object") {
        const configuracionNube = { ...configuracionInicial, ...datosNube.configuracion };
        setConfiguracion(configuracionNube);
        localStorage.setItem("taller_configuracion", JSON.stringify(configuracionNube));
      }
    } catch (error) {
      console.error("Error sincronizando con Google Sheets:", error);
      alert("⚠️ No se pudo sincronizar con la nube. Se conservarán temporalmente los datos de este dispositivo.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("taller_remisiones", JSON.stringify(ultimasRemisiones));
  }, [ultimasRemisiones]);

  useEffect(() => {
    localStorage.setItem("taller_gastos", JSON.stringify(historialGastos));
  }, [historialGastos]);

  useEffect(() => {
    localStorage.setItem("taller_movimientos", JSON.stringify(movimientos));
  }, [movimientos]);

  useEffect(() => {
    localStorage.setItem("taller_servicios", JSON.stringify(servicios));
  }, [servicios]);

  useEffect(() => {
    localStorage.setItem("taller_conceptos_gasto", JSON.stringify(conceptosGasto));
  }, [conceptosGasto]);

  useEffect(() => {
    localStorage.setItem("taller_configuracion", JSON.stringify(configuracion));
  }, [configuracion]);

  const totalGastosFijos = useMemo(() =>
    configuracion.sueldoBibi + configuracion.sueldoSalvador + configuracion.sueldoSuni +
    configuracion.renta + configuracion.auto + configuracion.internet,
  [configuracion]);

  const puntoEquilibrioDiario = totalGastosFijos / Math.max(configuracion.diasTrabajo, 1);

  const guardarConfiguracionEnNube = async () => {
    setCargando(true);
    try {
      const respuesta = await fetch(URL_GOOGLE_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          tipo: "guardar_configuracion",
          configuracion,
          usuario,
        }),
      });
      if (!respuesta.ok) throw new Error("No se pudo guardar la configuración");
      const resultado = await respuesta.json();
      if (resultado.status !== "success") throw new Error(resultado.message || "Error del servidor");
      localStorage.setItem("taller_configuracion", JSON.stringify(configuracion));
      alert("✅ Configuración guardada y sincronizada para todos los dispositivos.");
      await cargarDatosDesdeNube();
    } catch (error) {
      console.error(error);
      alert("❌ No se pudo guardar la configuración en la nube.");
    } finally {
      setCargando(false);
    }
  };

  // --- CONTROL DINÁMICO DE FOLIOS ---
  const [folioActual, setFolioActual] = useState("0001");

  useEffect(() => {
    if (ultimasRemisiones.length > 0) {
      const numerosFolio = ultimasRemisiones
        .map((r: Remision) => parseInt(r.folio, 10))
        .filter((num: number) => !isNaN(num));
      if (numerosFolio.length > 0) {
        const maxFolio = Math.max(...numerosFolio);
        setFolioActual(String(maxFolio + 1).padStart(4, "0"));
      } else {
        setFolioActual("0001");
      }
    } else {
      setFolioActual("0001");
    }
  }, [ultimasRemisiones]);

  // --- OPTIMIZACIÓN DE RENDIMIENTO: MEMOIZAR FILTRADO DE NOTAS ACTIVAS ---
  const notasActivas = useMemo(() => {
    return ultimasRemisiones.filter((r) => !["entregado", "cancelado"].includes(String(r.estado).trim().toLowerCase()));
  }, [ultimasRemisiones]);

  // --- INDICADORES DEL DASHBOARD (SOLO ADMINISTRADORES) ---
  const indicadores = useMemo(() => {
    const prefijoMes = today.slice(0, 7);
    const remisionesValidasHoy = ultimasRemisiones.filter(
      (r) => normalizarFecha(r.fechaRecibido) === today && String(r.estado).trim().toLowerCase() !== "cancelado"
    );
    const ventasHoy = remisionesValidasHoy.reduce((suma, r) => suma + Number(r.total || 0), 0);
    const remisionesHoy = remisionesValidasHoy.length;

    const tiposCobro = ["anticipo", "liquidación", "liquidacion", "ingreso adicional"];
    const cobradoHoy = movimientos
      .filter((m) => normalizarFecha(m.fecha) === today)
      .filter((m) => tiposCobro.includes(String(m.tipoMovimiento).trim().toLowerCase()))
      .reduce((suma, m) => suma + Number(m.monto || 0), 0);

    const remisionesMes = ultimasRemisiones.filter(
      (r) => normalizarFecha(r.fechaRecibido).startsWith(prefijoMes) && String(r.estado).trim().toLowerCase() !== "cancelado"
    );
    const ventasMes = remisionesMes.reduce((suma, r) => suma + Number(r.total || 0), 0);
    const anticiposMes = remisionesMes.reduce((suma, r) => suma + Number(r.anticipo || 0), 0);
    const cobrosPendientes = ultimasRemisiones
      .filter((r) => !["entregado", "cancelado"].includes(String(r.estado).trim().toLowerCase()))
      .reduce((suma, r) => suma + Number(r.saldo || 0), 0);

    const gastosHoy = historialGastos
      .filter((g) => normalizarFecha(g.fecha) === today)
      .reduce((suma, g) => suma + Number(g.monto || 0), 0);
    const gastosMes = historialGastos
      .filter((g) => normalizarFecha(g.fecha).startsWith(prefijoMes))
      .reduce((suma, g) => suma + Number(g.monto || 0), 0);

    const utilidadFlujo = anticiposMes - gastosMes;
    return {
      ventasHoy,
      cobradoHoy,
      remisionesHoy,
      ventasMes,
      anticiposMes,
      cobrosPendientes,
      gastosHoy,
      gastosMes,
      utilidadFlujo,
      trabajosActivos: notasActivas.length,
    };
  }, [ultimasRemisiones, historialGastos, movimientos, notasActivas, today]);

  // --- CAPTURA Y COMPRESIÓN AUTOMÁTICA DE FOTO ---
  const manejarCapturaFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (archivo) {
      const lector = new FileReader();
      lector.onloadend = () => {
        const img = new Image();
        img.src = lector.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_ANCHO = 800; 
          let ancho = img.width;
          let alto = img.height;

          if (ancho > MAX_ANCHO) {
            alto = Math.round((alto * MAX_ANCHO) / ancho);
            ancho = MAX_ANCHO;
          }

          canvas.width = ancho;
          canvas.height = alto;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, ancho, alto);
            const fotoComprimidaBase64 = canvas.toDataURL("image/jpeg", 0.7);
            setFotoPieza(fotoComprimidaBase64);
          }
        };
      };
      lector.readAsDataURL(archivo);
    }
  };

  // --- LÓGICA DE SESIÓN ---
  const iniciarSesion = () => {
    const encontrado = usuarios.find((u) => u.usuario === usuario && u.password === password);
    if (encontrado) {
      setRol(encontrado.rol);
      setVistaAdmin(encontrado.rol === "admin" ? "dashboard" : "remisiones");
      setSesionIniciada(true);
    } else {
      alert("❌ Usuario o contraseña incorrectos");
    }
  };

  const cerrarSesion = () => {
    setSesionIniciada(false);
    setUsuario(""); setPassword(""); setRol("vendedor");
  };

  // --- ENVIAR REMISIÓN NUEVA A GOOGLE SHEETS ---
  const guardarRemision = async () => {
    if (!cliente.trim() || !trabajo.trim() || !total) {
      alert("❌ Por favor llena los campos obligatorios: Cliente, Trabajo y Total.");
      return;
    }

    const totalNum = Number(total || 0);
    const anticipoNum = Number(anticipo || 0);

    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      alert("❌ El total debe ser una cantidad válida mayor a cero.");
      return;
    }

    if (!Number.isFinite(anticipoNum) || anticipoNum < 0 || anticipoNum > totalNum) {
      alert("❌ El anticipo debe ser una cantidad válida entre $0 y el total de la nota.");
      return;
    }

    const saldoCalculado = Math.max(0, totalNum - anticipoNum);
    const folioAGuardar = folioActual.trim();

    const payload = {
      accion: "crear_remision",
      datos: {
        folio: folioAGuardar,
        fechaRecibido,
        fechaEntrega,
        cliente: cliente.trim(),
        celular: celular.trim(),
        trabajo: trabajo.trim(),
        cantidadPiezas: Math.max(1, Number(cantidadPiezas || 1)),
        total: totalNum,
        anticipo: anticipoNum,
        metodoPago: anticipoNum > 0 ? metodoPagoAnticipo : "Efectivo",
        saldo: saldoCalculado,
        estado: "En Proceso",
        foto: fotoPieza,
        usuario,
      },
    };

    setCargando(true);

    try {
      const respuesta = await fetch(URL_GOOGLE_SCRIPT, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const textoRespuesta = await respuesta.text();

      if (!respuesta.ok) {
        throw new Error(
          `Error HTTP ${respuesta.status}: ${textoRespuesta.slice(0, 300)}`
        );
      }

      let resultado: { status?: string; message?: string };

      try {
        resultado = JSON.parse(textoRespuesta);
      } catch {
        throw new Error(
          "El servidor respondió con un formato no válido: " +
            textoRespuesta.slice(0, 300)
        );
      }

      if (resultado.status !== "success") {
        throw new Error(resultado.message || "El servidor no confirmó el guardado.");
      }

      alert(`✅ Nota #${folioAGuardar} guardada correctamente en la nube.`);
      setFileInputKey((valorActual) => valorActual + 1);

      // El guardado ya fue confirmado. Una falla al refrescar la pantalla
      // no debe mostrarse como si la nota no se hubiera guardado.
      void cargarDatosDesdeNube();
    } catch (error: unknown) {
      console.error("Error real al guardar la remisión:", error);

      const mensajeError =
        error instanceof Error ? error.message : "Error desconocido al guardar.";

      const copiaTemporal: Remision = {
        folio: folioAGuardar,
        fechaRecibido,
        fechaEntrega,
        cliente: cliente.trim(),
        celular: celular.trim(),
        trabajo: trabajo.trim(),
        cantidadPiezas: Math.max(1, Number(cantidadPiezas || 1)),
        total: totalNum,
        anticipo: anticipoNum,
        saldo: saldoCalculado,
        estado: "En Proceso",
        foto: fotoPieza,
        metodoPagoAnticipo,
      };

      setUltimasRemisiones((actuales) => {
        const yaExiste = actuales.some(
          (remision) => String(remision.folio) === String(folioAGuardar)
        );

        return yaExiste ? actuales : [copiaTemporal, ...actuales];
      });

      alert(
        "⚠️ No se pudo confirmar el guardado en la nube.\n\n" +
          mensajeError +
          "\n\nSe conservó una copia local temporal."
      );
    } finally {
      setCliente("");
      setCelular("");
      setTrabajo("");
      setCantidadPiezas("");
      setAnticipo("");
      setMetodoPagoAnticipo("Efectivo");
      setTotal("");
      setEstado("en proceso");
      setFotoPieza("");
      setFechaRecibido(today);
      setFechaEntrega("");
      setCargando(false);
    }
  };

  // --- ACTUALIZAR EL ESTATUS DE UNA ORDEN EXISTENTE CON ROLLBACK SEGURO ---
  const actualizarEstatusFila = async (folio: string, nuevoEstado: string, metodoLiquidacion?: MetodoPago) => {
    const estadoNormalizado =
      nuevoEstado.toLowerCase() === "entregado" ? "Entregado" :
      nuevoEstado.toLowerCase() === "listo" ? "Listo" :
      nuevoEstado.toLowerCase() === "cancelado" ? "Cancelado" : "En Proceso";

    if (estadoNormalizado === "Entregado" && !metodoLiquidacion) {
      const remision = ultimasRemisiones.find((item) => item.folio === folio);
      if (remision) {
        setEntregaPendiente(remision);
        setMetodoPagoEntrega("Efectivo");
      }
      return;
    }

    const respaldoRemisionesSeguras = [...ultimasRemisiones];
    const remisionOriginal = respaldoRemisionesSeguras.find((item) => item.folio === folio);

    setUltimasRemisiones((actuales) =>
      estadoNormalizado === "Entregado"
        ? actuales.filter((r) => r.folio !== folio)
        : actuales.map((r) => r.folio === folio ? { ...r, estado: estadoNormalizado } : r)
    );

    try {
      const respuesta = await fetch(URL_GOOGLE_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          accion: "actualizar_estado",
          datos: {
            folio,
            estado: estadoNormalizado,
            montoLiquidacion: estadoNormalizado === "Entregado" ? Number(remisionOriginal?.saldo || 0) : 0,
            metodoPago: metodoLiquidacion || "Efectivo",
            usuario,
          },
        }),
      });

      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.status !== "success") {
        throw new Error(resultado.message || "Error de respuesta del servidor");
      }

      if (estadoNormalizado === "Entregado") setEntregaPendiente(null);
      await cargarDatosDesdeNube();
    } catch (error) {
      console.error("Error al actualizar estatus en la nube:", error);
      alert("❌ No se pudo guardar el estatus en la nube. Se restableció el estado anterior.");
      setUltimasRemisiones(respaldoRemisionesSeguras);
    }
  };

  // --- ENVIAR GASTO A GOOGLE SHEETS (ACTUALIZACIÓN INMEDIATA) ---
  const guardarGasto = async () => {
    const conceptoFinal = conceptoGasto === "Otro" ? otroConceptoGasto.trim() : conceptoGasto;
    const montoNumero = Number(montoGasto);

    if (!conceptoFinal || !montoNumero || montoNumero <= 0) {
      alert("❌ Selecciona un concepto y escribe una cantidad válida.");
      return;
    }

    const nuevoGastoLocal: Gasto = {
      fecha: today,
      concepto: conceptoFinal,
      categoria: "Pendiente de sincronizar",
      monto: montoNumero,
      metodoPago: metodoPagoGasto,
    };

    const respaldoGastos = [...historialGastos];
    setHistorialGastos((actuales) => [nuevoGastoLocal, ...actuales]);

    const payloadGasto = {
      accion: "registrar_gasto",
      datos: {
        fecha: today,
        concepto: conceptoGasto,
        conceptoOtro: conceptoGasto === "Otro" ? conceptoFinal : "",
        monto: montoNumero,
        metodoPago: metodoPagoGasto,
        hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        usuario,
      },
    };

    setMontoGasto("");
    setOtroConceptoGasto("");
    setMetodoPagoGasto("Efectivo");

    try {
      const respuesta = await fetch(URL_GOOGLE_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payloadGasto),
      });

      if (!respuesta.ok) throw new Error("Fallo del servidor de Google");
      const resultado = await respuesta.json();
      if (resultado.status !== "success") throw new Error(resultado.message || "No se pudo guardar el gasto");

      setHistorialGastos((actuales) => actuales.map((gasto, indice) =>
        indice === 0 ? { ...gasto, categoria: String(resultado.categoria || "Sincronizado") } : gasto
      ));
    } catch (error) {
      console.error(error);
      setHistorialGastos(respaldoGastos);
      alert("❌ El gasto no pudo guardarse en la nube y se retiró de la pantalla.");
    }
  };

  // --- VISTA DE ACCESO (LOGIN) ---
  if (!sesionIniciada) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-pink-300">
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="w-32 h-32 bg-white rounded-3xl p-3 shadow-lg border border-pink-200 flex items-center justify-center mb-4">
              <img src="/LOG_1_01.png" alt="Logo" className="w-full h-full object-contain" onError={(e)=>{e.currentTarget.src="https://via.placeholder.com/150?text=BIIB";}}/>
            </div>
            <h1 className="text-2xl font-black text-pink-500">TALLER BIIB ERP</h1>
            <p className="text-gray-500 text-sm font-medium">Administra. Controla. Crece.</p>
          </div>
          <div className="space-y-4">
            <input className="w-full border rounded-xl p-3" placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            <input type="password" className="w-full border rounded-xl p-3" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={iniciarSesion} className="w-full bg-pink-500 text-white rounded-2xl p-4 font-semibold">Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-pink-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-pink-500">TALLER BIIB ERP</h1>
            <p className="text-gray-500">Operador: <span className="font-bold uppercase">{usuario}</span> · <span className="font-semibold">{rol === "admin" ? "SUPER ADMINISTRADOR" : "VENTAS"}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={cargarDatosDesdeNube} className="bg-pink-100 text-pink-600 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-pink-200">🔄 Sincronizar</button>
            <button onClick={cerrarSesion} className="bg-black text-white px-4 py-2 rounded-xl font-semibold text-sm">Cerrar sesión</button>
          </div>
        </div>

        {/* MENÚ ADMIN */}
        {rol === "admin" && (
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setVistaAdmin("dashboard")} className={`px-5 py-2.5 rounded-xl font-semibold ${vistaAdmin === "dashboard" ? "bg-gray-900 text-white" : "bg-white"}`}>📊 Dashboard</button>
            <button onClick={() => setVistaAdmin("remisiones")} className={`px-5 py-2.5 rounded-xl font-semibold ${vistaAdmin === "remisiones" ? "bg-pink-500 text-white" : "bg-white"}`}>📋 Remisiones</button>
            <button onClick={() => setVistaAdmin("gastos")} className={`px-5 py-2.5 rounded-xl font-semibold ${vistaAdmin === "gastos" ? "bg-red-500 text-white" : "bg-white"}`}>💸 Gastos</button>
            <button onClick={() => setVistaAdmin("servicios")} className={`px-5 py-2.5 rounded-xl font-semibold ${vistaAdmin === "servicios" ? "bg-purple-500 text-white" : "bg-white"}`}>🛠 Servicios</button>
            <button onClick={() => setVistaAdmin("configuracion")} className={`px-5 py-2.5 rounded-xl font-semibold ${vistaAdmin === "configuracion" ? "bg-blue-600 text-white" : "bg-white"}`}>⚙️ Configuración</button>
          </div>
        )}

        {/* DASHBOARD EJECUTIVO (SOLO SUPER ADMINISTRADORES) */}
        {rol === "admin" && vistaAdmin === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-3xl shadow-xl p-6">
              <p className="text-sm font-semibold opacity-90">Resumen ejecutivo</p>
              <h2 className="text-3xl font-black mt-1">Estado del taller</h2>
              <p className="text-sm mt-2 opacity-90">Información visible únicamente para Bibi y Salvador.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                ["Ventas hoy", indicadores.ventasHoy, "💰", "text-emerald-600"],
                ["Cobrado hoy", indicadores.cobradoHoy, "🏦", "text-blue-600"],
                ["Gastos hoy", indicadores.gastosHoy, "🧾", "text-red-600"],
                ["Ventas del mes", indicadores.ventasMes, "📈", "text-pink-600"],
                ["Cobrado del mes", indicadores.anticiposMes, "🏦", "text-blue-600"],
                ["Gastos del mes", indicadores.gastosMes, "💸", "text-red-600"],
                ["Flujo disponible", indicadores.utilidadFlujo, "💵", indicadores.utilidadFlujo >= 0 ? "text-emerald-600" : "text-red-600"],
                ["Por cobrar", indicadores.cobrosPendientes, "📞", "text-orange-600"],
              ].map(([titulo, valor, icono, clase]) => (
                <div key={String(titulo)} className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-500">{titulo}</p>
                    <span className="text-2xl">{icono}</span>
                  </div>
                  <p className={`text-3xl font-black mt-3 ${clase}`}>${Number(valor).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
              <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-500">Remisiones de hoy</p>
                  <span className="text-2xl">🧾</span>
                </div>
                <p className="text-3xl font-black mt-3 text-indigo-600">{indicadores.remisionesHoy}</p>
                <p className="text-xs text-gray-400 mt-2">Fecha de cálculo: {today}</p>
              </div>

              <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-500">Trabajos activos</p>
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-3xl font-black mt-3 text-purple-600">{indicadores.trabajosActivos}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h3 className="text-xl font-black text-gray-800">Costos fijos mensuales</h3>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    ["Sueldo Bibi", configuracion.sueldoBibi],
                    ["Sueldo Salvador", configuracion.sueldoSalvador],
                    ["Sueldo Suni", configuracion.sueldoSuni],
                    ["Renta", configuracion.renta],
                    ["Arrendamiento del auto", configuracion.auto],
                    ["Internet", configuracion.internet]
                  ].map(([nombre, monto]) => (
                    <div key={String(nombre)} className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">{nombre}</span><strong>${Number(monto).toLocaleString("es-MX")}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between bg-gray-900 text-white rounded-2xl p-4">
                    <span className="font-bold">Total fijo mensual</span><strong>${totalGastosFijos.toLocaleString("es-MX")}</strong>
                  </div>
                  <div className="flex justify-between bg-blue-50 text-blue-900 rounded-2xl p-4">
                    <span className="font-bold">Meta mínima diaria</span><strong>${puntoEquilibrioDiario.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</strong>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h3 className="text-xl font-black text-gray-800">Lectura rápida</h3>
                <div className="mt-4 space-y-3">
                  <div className={`rounded-2xl p-4 ${indicadores.utilidadFlujo >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                    <p className="font-black">{indicadores.utilidadFlujo >= 0 ? "Flujo positivo" : "Atención: flujo negativo"}</p>
                    <p className="text-sm mt-1">Cobros registrados menos gastos capturados durante el mes.</p>
                  </div>
                  <div className="bg-orange-50 text-orange-800 rounded-2xl p-4">
                    <p className="font-black">Pendiente de cobranza</p>
                    <p className="text-sm mt-1">Hay ${indicadores.cobrosPendientes.toLocaleString("es-MX", { minimumFractionDigits: 2 })} por recuperar en notas activas.</p>
                  </div>
                  <p className="text-xs text-gray-400">La utilidad mostrada es flujo estimado; todavía no descuenta automáticamente el costo individual de materiales de cada servicio.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN REMISIONES */}
        {(rol === "vendedor" || vistaAdmin === "remisiones") && (
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* FORMULARIO NUEVA REMISIÓN */}
            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
              <div className="flex justify-between items-center bg-pink-50 p-3 rounded-2xl border border-pink-100">
                <h2 className="text-xl font-bold text-gray-800">➕ Nueva Nota</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-pink-500 uppercase">Folio App:</span>
                  <input 
                    type="text" 
                    className="w-24 text-center font-bold border border-pink-300 rounded-xl p-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400" 
                    value={folioActual} 
                    onChange={(e) => setFolioActual(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">📅 Recibido</label>
                  <input type="date" className="w-full border rounded-xl p-2 bg-white text-sm" value={fechaRecibido} onChange={(e) => setFechaRecibido(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">⏰ Entrega</label>
                  <input type="date" className="w-full border rounded-xl p-2 bg-white text-sm" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
                </div>
              </div>

              <input className="w-full border rounded-xl p-3" placeholder="Nombre del cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
              <input className="w-full border rounded-xl p-3" placeholder="Número de celular" value={celular} onChange={(e) => setCelular(e.target.value)} />
              <select
                className="w-full border rounded-xl p-3 bg-white"
                value={servicioSeleccionado}
                onChange={(e) => {
                  const id = e.target.value;
                  setServicioSeleccionado(id);
                  const servicio = servicios.find((item) => item.id === id);
                  if (servicio) {
                    setTrabajo(servicio.nombre);
                    setTotal(String(servicio.precio));
                  }
                }}
              >
                <option value="">Seleccionar servicio (opcional)</option>
                {servicios.filter((item) => item.activo).map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre} — ${item.precio.toFixed(2)}</option>
                ))}
              </select>
              <textarea className="w-full border rounded-xl p-3" placeholder="Trabajo a realizar..." rows={2} value={trabajo} onChange={(e) => setTrabajo(e.target.value)} />

              <div className="border-2 border-dashed border-pink-200 rounded-xl p-3 text-center">
                <input key={fileInputKey} type="file" accept="image/*" capture="environment" onChange={manejarCapturaFoto} className="text-xs" />
                {fotoPieza && <img src={fotoPieza} alt="Vista previa" className="w-20 h-20 mx-auto mt-2 rounded-xl object-cover" />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="border rounded-xl p-3" placeholder="Cantidad piezas" value={cantidadPiezas} onChange={(e) => setCantidadPiezas(e.target.value)} />
                <input type="number" className="border rounded-xl p-3" placeholder="Total $" value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anticipo</label>
                  <input type="number" min="0" className="w-full border rounded-xl p-3" placeholder="$0.00" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método de pago</label>
                  <select
                    className="w-full border rounded-xl p-3 bg-white text-sm"
                    value={metodoPagoAnticipo}
                    onChange={(e) => setMetodoPagoAnticipo(e.target.value as MetodoPago)}
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Transferencia">🏦 Transferencia</option>
                  </select>
                  {Number(anticipo || 0) <= 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">Se aplicará cuando captures un anticipo.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                  <select className="w-full border rounded-xl p-3 bg-white text-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
                    <option value="en proceso">En Proceso</option>
                    <option value="listo">Listo</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <button onClick={guardarRemision} disabled={cargando} className="w-full bg-pink-500 text-white rounded-2xl p-4 font-semibold">
                {cargando ? "⏳ Procesando..." : "Guardar Nota"}
              </button>
            </div>

            {/* HISTORIAL INTERACTIVO ACTIVO */}
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">📋 Órdenes en Taller ({notasActivas.length})</h2>
              </div>
              
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {notasActivas.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No hay reparaciones activas pendientes en el taller. ¡Buen trabajo!</p>
                ) : (
                  notasActivas.map((rem: Remision) => (
                    <div key={rem.folio} className="border border-gray-100 rounded-2xl p-4 bg-white hover:bg-gray-50 flex flex-col gap-3 shadow-sm">
                      
                      {/* Fila Superior */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-base">#{rem.folio}</span>
                            <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded">📅 {rem.fechaRecibido}</span>
                            {rem.fechaEntrega && (
                              <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">
                                ⏱️ {rem.fechaEntrega}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-gray-500">Cliente: <span className="text-gray-700 font-normal">{rem.cliente || "General"}</span></p>
                        </div>
                        
                        {/* Foto de la joya */}
                        {rem.foto && (
                          <img src={rem.foto} alt="Joyería" className="w-14 h-14 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
                        )}
                      </div>

                      {/* Fila Media: Trabajo */}
                      <p className="text-gray-600 text-sm bg-gray-50/50 p-2 rounded-xl border border-gray-50 line-clamp-2">
                        {rem.trabajo}
                      </p>

                      <div className="border-t border-dashed border-gray-100 pt-2"></div>

                      {/* Fila Inferior */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <select 
                            value={rem.estado} 
                            onChange={(e) => actualizarEstatusFila(rem.folio, e.target.value)}
                            className={`text-xs font-bold px-2 py-1.5 rounded-xl border bg-white focus:outline-none shadow-sm transition-colors ${
                              rem.estado === "listo" ? "border-blue-300 text-blue-600 bg-blue-50" :
                              rem.estado === "en proceso" ? "border-orange-300 text-orange-600 bg-orange-50" :
                              rem.estado === "cancelado" ? "border-red-300 text-red-600 bg-red-50" : "border-gray-200 text-gray-600"
                            }`}
                          >
                            <option value="en proceso">En Proceso</option>
                            <option value="listo">Listo</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          {Number(rem.saldo) > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight leading-none">Debe</p>
                              <p className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                                ${Number(rem.saldo).toFixed(2)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight leading-none">Total</p>
                            <p className="text-sm font-black text-gray-900 mt-0.5">
                              ${Number(rem.total || 0).toFixed(2)}
                            </p>
                            {rem.metodoPagoAnticipo && Number(rem.anticipo || 0) > 0 && (
                              <p className="text-[10px] text-gray-400 mt-1">Anticipo: {rem.metodoPagoAnticipo}</p>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

          </div> 
        )}



        {/* CONFIGURACIÓN DEL NEGOCIO (SOLO ADMIN) */}
        {rol === "admin" && vistaAdmin === "configuracion" && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">⚙️ Configuración del negocio</h2>
              <p className="text-sm text-gray-500 mt-1">Estos valores actualizan automáticamente el Dashboard y el punto de equilibrio.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ["Sueldo Bibi", "sueldoBibi"],
                ["Sueldo Salvador", "sueldoSalvador"],
                ["Sueldo Suni", "sueldoSuni"],
                ["Renta mensual", "renta"],
                ["Arrendamiento del auto", "auto"],
                ["Internet", "internet"],
                ["Días de trabajo", "diasTrabajo"],
              ].map(([etiqueta, campo]) => (
                <label key={campo} className="block bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <span className="block text-sm font-bold text-gray-600 mb-2">{etiqueta}</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded-xl p-3 bg-white font-bold"
                    value={configuracion[campo as keyof ConfiguracionNegocio]}
                    onChange={(e) => setConfiguracion((actual) => ({
                      ...actual,
                      [campo]: Math.max(0, Number(e.target.value || 0)),
                    }))}
                  />
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-gray-900 text-white p-5">
                <p className="text-sm opacity-70">Gastos fijos mensuales</p>
                <p className="text-3xl font-black mt-2">${totalGastosFijos.toLocaleString("es-MX")}</p>
              </div>
              <div className="rounded-2xl bg-blue-600 text-white p-5">
                <p className="text-sm opacity-80">Punto de equilibrio diario</p>
                <p className="text-3xl font-black mt-2">${puntoEquilibrioDiario.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            <button
              onClick={guardarConfiguracionEnNube}
              disabled={cargando}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-2xl"
            >
              {cargando ? "⏳ Guardando..." : "☁️ Guardar configuración para todos"}
            </button>
            <p className="text-xs text-gray-400">La configuración se guarda en Google Sheets y se descarga al iniciar sesión o al presionar Sincronizar.</p>
          </div>
        )}

        {/* SECCIÓN GASTOS (SOLO ADMIN) */}
        {rol === "admin" && vistaAdmin === "gastos" && (
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* REGISTRO DE GASTO */}
            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4 border-t-4 border-red-400">
              <h2 className="text-2xl font-semibold text-gray-800">💸 Registrar Gasto Diario</h2>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Concepto</label>
                <select
                  className="w-full border rounded-xl p-3 bg-white"
                  value={conceptoGasto}
                  onChange={(e) => setConceptoGasto(e.target.value)}
                >
                  {conceptosGasto.map((concepto) => (
                    <option key={concepto} value={concepto}>{concepto}</option>
                  ))}
                </select>
              </div>
              {conceptoGasto === "Otro" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Especificar concepto</label>
                  <input
                    className="w-full border rounded-xl p-3"
                    placeholder="Escribe el concepto del gasto"
                    value={otroConceptoGasto}
                    onChange={(e) => setOtroConceptoGasto(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantidad</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border rounded-xl p-3"
                  placeholder="$0.00"
                  value={montoGasto}
                  onChange={(e) => setMontoGasto(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método de pago</label>
                <select
                  className="w-full border rounded-xl p-3 bg-white"
                  value={metodoPagoGasto}
                  onChange={(e) => setMetodoPagoGasto(e.target.value as MetodoPago)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <button onClick={guardarGasto} disabled={cargando} className="w-full bg-red-500 text-white rounded-2xl p-4 font-semibold">{cargando ? "⏳..." : "Registrar Egreso"}</button>
            </div>
            
            {/* HISTORIAL DE GASTOS */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">📉 Historial de Gastos</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {historialGastos.map((gas: Gasto, idx: number) => (
                  <div key={idx} className="border rounded-2xl p-4 bg-white flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-gray-800">{gas.concepto}</p>
                      <p className="text-xs text-gray-400">📅 {gas.fecha}</p>
                      <p className="text-xs text-gray-400">{gas.metodoPago === "Transferencia" ? "🏦" : "💵"} {gas.metodoPago || "Sin especificar"}</p>
                    </div>
                    <p className="text-red-500 font-bold">-${gas.monto}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* CATÁLOGO DE SERVICIOS (SOLO SUPER ADMIN) */}
        {rol === "admin" && vistaAdmin === "servicios" && (
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">🛠 Catálogo de servicios</h2>
                <p className="text-sm text-gray-500">Los precios y costos quedan abiertos para modificarlos cuando sea necesario.</p>
              </div>
              <button
                onClick={() => setServicios([...servicios, { id: `servicio-${Date.now()}`, nombre: "Nuevo servicio", precio: 0, costo: 0, activo: true }])}
                className="bg-purple-500 text-white px-4 py-2 rounded-xl font-semibold"
              >
                + Agregar servicio
              </button>
            </div>
            <div className="space-y-3">
              {servicios.map((servicio) => (
                <div key={servicio.id} className="grid md:grid-cols-[1fr_150px_150px_100px] gap-3 border rounded-2xl p-4">
                  <input
                    className="border rounded-xl p-3"
                    value={servicio.nombre}
                    onChange={(e) => setServicios(servicios.map((item) => item.id === servicio.id ? { ...item, nombre: e.target.value } : item))}
                  />
                  <input
                    type="number"
                    className="border rounded-xl p-3"
                    value={servicio.precio}
                    aria-label={`Precio de ${servicio.nombre}`}
                    onChange={(e) => setServicios(servicios.map((item) => item.id === servicio.id ? { ...item, precio: Number(e.target.value) } : item))}
                  />
                  <input
                    type="number"
                    className="border rounded-xl p-3"
                    value={servicio.costo}
                    aria-label={`Costo de ${servicio.nombre}`}
                    onChange={(e) => setServicios(servicios.map((item) => item.id === servicio.id ? { ...item, costo: Number(e.target.value) } : item))}
                  />
                  <label className="flex items-center justify-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={servicio.activo}
                      onChange={(e) => setServicios(servicios.map((item) => item.id === servicio.id ? { ...item, activo: e.target.checked } : item))}
                    />
                    Activo
                  </label>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-5 text-sm">
              <div className="bg-purple-50 rounded-2xl p-4"><span className="font-bold">Precio:</span> editable y usado al crear nuevas notas.</div>
              <div className="bg-pink-50 rounded-2xl p-4"><span className="font-bold">Costo:</span> editable para análisis de utilidad.</div>
              <div className="bg-gray-50 rounded-2xl p-4"><span className="font-bold">Historial:</span> las notas anteriores conservan su total original.</div>
            </div>
          </div>
        )}


        {entregaPendiente && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Confirmar entrega</h3>
                <p className="text-sm text-gray-500 mt-1">Nota #{entregaPendiente.folio} · {entregaPendiente.cliente}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">Saldo a liquidar</p>
                <p className="text-3xl font-black text-gray-900 mt-1">${Number(entregaPendiente.saldo || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Método de pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["Efectivo", "Transferencia"] as MetodoPago[]).map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoPagoEntrega(metodo)}
                      className={`rounded-2xl border p-4 font-bold ${metodoPagoEntrega === metodo ? "bg-pink-500 text-white border-pink-500" : "bg-white text-gray-700 border-gray-200"}`}
                    >
                      {metodo === "Efectivo" ? "💵 Efectivo" : "🏦 Transferencia"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEntregaPendiente(null)}
                  className="rounded-2xl bg-gray-100 text-gray-700 p-3 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => actualizarEstatusFila(entregaPendiente.folio, "entregado", metodoPagoEntrega)}
                  className="rounded-2xl bg-green-600 text-white p-3 font-bold"
                >
                  Confirmar entrega
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
