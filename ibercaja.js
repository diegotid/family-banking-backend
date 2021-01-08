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