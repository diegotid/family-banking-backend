IrA('../ModuloDirector.asp','53_0','li2');

function IrA(pstrDireccion,pstrOperacion,opcionseleccionada)
{
	var longitudopcionseleccionada = opcionanterior.length;
	if(opcionseleccionada.substr(2,longitudopcionseleccionada)!= opcionanterior && opcionanterior!= ""){
		document.getElementById(opcionanterior).className = 'bolitafijasinseleccionar';
		abrircerrar = "abrir"
	}
	//Si la opcion que nos llega empieza por 'A', entonces es una subopción, por lo tanto hay que tratarlo de otra forma.
	if (opcionseleccionada.charAt(0)!="A"){	
		Cambiar_estilo(opcionseleccionada)		
	}else{	
		Cambiar_estilo_acordeon(opcionseleccionada,opcionseleccionada.charAt(1))		
	}
	document.Formulario.IdOperacion.value = pstrOperacion;
	if (pstrOperacion == "0002_1")
	{
		window.document.Formulario.tipotransferencia.value = "traspaso"
	}
	else if (pstrOperacion == "0003_1")
	{
		window.document.Formulario.tipotransferencia.value = "transferenciaibe"
	}
	else
	{
		window.document.Formulario.tipotransferencia.value = "transferenciaext"
	}
	
	document.Formulario.action = "../asp/" + pstrDireccion + "?MSCSAuth=7A6B0289E13645C49E1FDC58E8F82D2DOONWN20210108184520COGUIM13645C49E1HRXNFDC58E8F82QIPJLEE85CDF1E94C5463ELJPIQ28F8E85CDFNXRHF1E94C54631E9820B6A7ELJPIQ28"
	document.Formulario.target = "operativas";
	document.Formulario.submit(); 
}

function ValidarDatos3(mensaje1, mensaje2 , mensaje3,mensaje4,ticket,mensaje5)
{
	
	var diaInicio;
	var mesInicio;
	var anoInicio;
	var diaFin;
	var mesFin;
	var anoFin;

	var importeMin;
	var importeMax;	
	

	diaInicio = document.Formulario.FechaInicioDia.value;
	mesInicio= document.Formulario.FechaInicioMes.value;
	anoInicio=  document.Formulario.FechaInicioAno.value;


	diaFin= document.Formulario.FechaFinDia.value;
	mesFin= document.Formulario.FechaFinMes.value;
	anoFin= document.Formulario.FechaFinAno.value;
	

	importeMin = document.Formulario.ImporteMinimo.value.replace(",",".");
	importeMax = document.Formulario.ImporteMaximo.value.replace(",",".");
	importeMin  = parseFloat(importeMin ) * 100;
	importeMax = parseFloat(importeMax) * 100;
	if(importeMin > 0 && importeMax > 0)
	{
		if(importeMin > importeMax)
		{
			document.Formulario.ImporteMinimo.focus();
			document.Formulario.ImporteMinimo.select();
			alert(mensaje5);
			return false;	
		}
	}
	
	if ( (diaInicio + mesInicio + anoInicio).length < 8 )
	{
		alert(mensaje4);
		return false;		
	}
		
	if ( (diaInicio + mesInicio + anoInicio).length > 2)
		if (!validar_fecha(diaInicio , mesInicio , anoInicio ))
		{
			alert(mensaje1);
			return false;
		}
	if ((diaFin + mesFin + anoFin).length != 0){
		if ((diaFin + mesFin + anoFin).length < 8){
			alert("El campo Fecha Hasta está incompleto");
			return false;				
		}else{
			if (!validar_fecha(diaFin , mesFin , anoFin ))
			{
				alert("Fecha Hasta incorrecta");
				return false;		
			}
		}
		
	}
	if ( (diaInicio + mesInicio + anoInicio).length > 2 && (diaFin + mesFin + anoFin).length > 2)
		if (CompararFechas(diaInicio + mesInicio + anoInicio, diaFin + mesFin + anoFin) == 1)
		{
			alert(mensaje3);
			return false;
		}
	
		
	cont = cont + 1;
	if (cont > 1) {
		return false;
	}else{
			
		lanzapagina(ticket);
	}
}
