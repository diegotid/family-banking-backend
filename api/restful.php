<?php
require_once '../conf/db.php';
require_once '../conf/auth.php';
require_once 'API.class.php';

class bancaAPI extends API {

  protected function login() {

    global $access_password;

    if ($this->method == 'POST' && $this->file
    && md5(json_decode($this->file)->password) === md5($access_password)) {
      return array('status' => 200, 'token' => md5($access_password));
    } else {
      return array('error' => 401, 'message' => 'Unauthorized');
    }
  }


  protected function accounts() {

    global $con;
    global $access_password;
    
    if ($this->method == 'GET') {
      
      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
      $total = 0;
      $lista = [];
      $result = $con->query("SELECT C.id id, logo, C.nombre name, C.color color, descripcion, balance
                            FROM CUENTA C JOIN BANCO B ON C.banco = B.id ORDER BY id");
      while ($cuenta = $result->fetch_assoc()) {
        $cuenta['id'] = intval($cuenta['id']);
        if (!isset($cuenta['name'])) {
          $cuenta['name'] = $cuenta['descripcion'];
        }
        unset($cuenta['descripcion']);
        if (isset($cuenta['balance'])) {
          $cuenta['balance'] = round(floatval($cuenta['balance']), 2);
          $total += $cuenta['balance'];
        }
        array_push($lista, $cuenta);
      }
      return array(
        'status' => 200,
        'total' => $total,
        'accounts' => $lista
      );
    }
  }
  
  protected function transactions() {
    
    global $con;
    global $access_password;

    if ($this->method == 'GET') {

      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
      $movimientos = [];
      
      $offset = 0;
      if (isset($this->request['offset'])) {
        $offset = $this->request['offset'];
      }
      $query = "SELECT hash, fecha, importe, M.descripcion descripcion, T.id id_categoria, T.nombre nombre_categoria, C.nombre nombre_cuenta, C.codigo codigo_cuenta, C.id id_cuenta, balance, logo banco, C.color color
                FROM MOVIMIENTO M
                JOIN CUENTA C ON M.cuenta = C.id
                JOIN BANCO B ON C.banco = B.id
                LEFT JOIN CATEGORIA T ON categoria = T.id
                WHERE " . $this->query() . "
                ORDER BY fecha DESC LIMIT " . $offset . ", 20";

      $result = $con->query($query);

      $total = 0;
      $from = new DateTime();
      $through = (new DateTime())->setTimestamp(0);
      while ($movimiento = $result->fetch_assoc()) {
        $movimiento['date'] = $movimiento['fecha'];
        $movimiento['amount'] = round(floatval($movimiento['importe']), 2);
        $movimiento['account'] = array(
          'id' => intval($movimiento['id_cuenta']),
          'name' => $movimiento['nombre_cuenta'],
          'color' => $movimiento['color']
        );
        if ($movimiento['account']['name'] == '') {
          $movimiento['account']['name'] = $movimiento['codigo_cuenta'];
        }
        $movimiento['account']['balance'] = round(floatval($movimiento['balance']), 2);
        $movimiento['concept'] = $movimiento['descripcion'];
        $movimiento['logo'] = $movimiento['banco'];
        $total += floatval($movimiento['amount']);
        if (new DateTime($movimiento['fecha']) < $from) {
          $from = new DateTime($movimiento['fecha']);
        }
        if (new DateTime($movimiento['fecha']) > $through) {
          $through = new DateTime($movimiento['fecha']);
        }
        unset($movimiento['descripcion']);
        unset($movimiento['banco']);
        unset($movimiento['importe']);
        unset($movimiento['fecha']);
        unset($movimiento['color']);
        unset($movimiento['balance']);
        unset($movimiento['id_categoria']);
        unset($movimiento['nombre_categoria']);
        unset($movimiento['codigo_cuenta']);
        unset($movimiento['nombre_cuenta']);
        unset($movimiento['id_cuenta']);
        array_push($movimientos, $movimiento);
      }
      $resultado = [];
      $resultado['lista'] = $movimientos;
      $resultado['resumen'] = [];
      $resultado['resumen']['total'] = round($total, 2);
      $resultado['resumen']['from'] = $from->format('Y-m-d');
      $resultado['resumen']['through'] = $through->format('Y-m-d');

      return array('status' => 200, 'summary' => $resultado['resumen'], 'transactions' => $movimientos);
    }
  }

  protected function cuentas() {

    global $con;
    global $access_password;
    
    if ($this->method == 'GET') {
      
      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
  
      $total = 0;
      $lista = [];
      
      $result = $con->query("SELECT C.id cuenta, logo, C.nombre nombre, C.color color, descripcion, balance
                            FROM CUENTA C JOIN BANCO B ON C.banco = B.id
                            ORDER BY balance - 1000000 * IF(balance < 0, balance * 1, 0) DESC");
      while ($cuenta = $result->fetch_assoc()) {
        if (!isset($cuenta['nombre'])) {
          $cuenta['nombre'] = $cuenta['descripcion'];
        }
        unset($cuenta['descripcion']);
        if (isset($cuenta['balance'])) {
          $cuenta['balance'] = round(floatval($cuenta['balance']), 2);
          $total += $cuenta['balance'];
        }
        array_push($lista, $cuenta);
      }

      $cuentas = [];
      $cuentas['total'] = $total;
      $cuentas['lista'] = $lista;
      
      return array('status' => 200, 'cuentas' => $cuentas);

    } else if ($this->method == 'PUT') {

      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
  
      $id = $this->args[0];
      $color = $this->request['color'];
      $nombre = $this->request['nombre'];

      $con->query("UPDATE CUENTA SET nombre = '{$nombre}', color = '{$color}' WHERE id = {$id}");
      if ($con->affected_rows > 0) {
        return array('status' => 200, 'message' => 'Success');
      } else {
        return array('status' => 204, 'message' => 'No changes');
      }
    }
  }

  protected function categorias() {

    global $con;
    global $access_password;
    
    if ($this->method == 'GET') {
      
      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
  
      $total = 0;
      $lista = [];
      if (isset($this->request['q'])) {
        $filtros = json_decode(urldecode($this->request['q']));
        $condiciones = $this->condiciones($filtros);
      } else {
        $condiciones = " TRUE";
      }
      $condiciones .= " AND M.fecha > (CURRENT_DATE - INTERVAL 1 MONTH)";

      $query = "SELECT T.id id, T.nombre nombre, COUNT(*) numero
                FROM MOVIMIENTO M
                JOIN CUENTA C ON M.cuenta = C.id
                JOIN BANCO B ON C.banco = B.id
                JOIN CATEGORIA T ON categoria = T.id
                WHERE " . $condiciones . "
                GROUP BY T.id ORDER BY numero DESC LIMIT 10";

      $result = $con->query($query);
      while ($categoria = $result->fetch_assoc()) {
        array_push($lista, $categoria);
      }

      $result = $con->query("SELECT * FROM CATEGORIA WHERE id NOT IN
                            (SELECT categoria FROM MOVIMIENTO M
                            JOIN CUENTA C ON M.cuenta = C.id
                            JOIN CATEGORIA T ON M.categoria = T.id
                            WHERE " . $condiciones . ")");
      while ($categoria = $result->fetch_assoc()) {
        $categoria['numero'] = 0;
        array_push($lista, $categoria);
      }

      $categorias = [];
      $categorias['lista'] = $lista;
      
      return array('status' => 200, 'categorias' => $categorias);
    }
  }
  
  protected function movimientos() {
    
    global $con;
    global $access_password;

    if ($this->method == 'GET') {

      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
  
      $movimientos = [];
      
      $offset = 0;
      if (isset($this->args[0])) $offset = $this->args[0];
      $filtros = json_decode(urldecode($this->request['q']));

      $query = "SELECT fecha, importe, M.descripcion descripcion, T.id id_categoria, T.nombre nombre_categoria, C.nombre nombre_cuenta, C.codigo codigo_cuenta, C.id id_cuenta, balance, logo banco, C.color color
                FROM MOVIMIENTO M
                JOIN CUENTA C ON M.cuenta = C.id
                JOIN BANCO B ON C.banco = B.id
                LEFT JOIN CATEGORIA T ON categoria = T.id
                WHERE " . $this->condiciones($filtros) . "
                ORDER BY fecha DESC LIMIT " . $offset . ", 20";

      $result = $con->query($query);
      while ($movimiento = $result->fetch_assoc()) {
        $movimiento['importe'] = round(floatval($movimiento['importe']), 2);
        $movimiento['categoria'] = array(
          'id' => intval($movimiento['id_categoria']),
          'nombre' => $movimiento['nombre_categoria']
        );
        $movimiento['cuenta'] = array(
          'id' => intval($movimiento['id_cuenta']),
          'nombre' => $movimiento['nombre_cuenta'],
          'color' => $movimiento['color']
        );
        if ($movimiento['cuenta']['nombre'] == '') {
          $movimiento['cuenta']['nombre'] = $movimiento['codigo_cuenta'];
        }
        $movimiento['cuenta']['balance'] = $movimiento['balance'];
        unset($movimiento['color']);
        unset($movimiento['balance']);
        unset($movimiento['id_categoria']);
        unset($movimiento['nombre_categoria']);
        unset($movimiento['codigo_cuenta']);
        unset($movimiento['nombre_cuenta']);
        unset($movimiento['id_cuenta']);
        array_push($movimientos, $movimiento);
      }

      $resultado = [];
      $resultado['lista'] = $movimientos;

      if ($offset == 0 && !empty($filtros)) {
        $condiciones = $this->condiciones($filtros);
        $condiciones .= " AND M.fecha > (CURRENT_DATE - INTERVAL 1 MONTH)";
        $query = "SELECT SUM(M.importe) total, MIN(M.fecha) desde, MAX(M.fecha) hasta
                  FROM MOVIMIENTO M
                  JOIN CUENTA C ON M.cuenta = C.id
                  JOIN BANCO B ON C.banco = B.id
                  JOIN CATEGORIA T ON categoria = T.id
                  WHERE ";
        $result = $con->query($query . $condiciones);
        $resultado['resumen'] = $result->fetch_assoc();
        if (!$resultado['resumen']['total']) {
          $condiciones = $this->condiciones($filtros);
          $condiciones .= " LIMIT 20";
          $result = $con->query($query . $condiciones);
          $resultado['resumen'] = $result->fetch_assoc();
        }
      }

      return array('status' => 200, 'movimientos' => $resultado);
    }
  }

  protected function limites() {
    
    global $con;
    global $access_password;

    if ($this->method == 'GET') {

      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }

      $filtros = json_decode(urldecode($this->request['q']));
      $condiciones = $this->condiciones($filtros);

      $query = "SELECT MAX(ABS(M.importe)) max, MIN(ABS(M.importe)) min, COUNT(*) no
                FROM MOVIMIENTO M
                JOIN CUENTA C ON M.cuenta = C.id
                JOIN BANCO B ON C.banco = B.id
                JOIN CATEGORIA T ON categoria = T.id
                WHERE " . $condiciones;

      $result = $con->query($query);
      $limites = $result->fetch_assoc();
      
      $percentiles = array(5 => null, 95 => null);
      foreach ($percentiles as $perc => $value) {
        $query = "SELECT ABS(M.importe) valor
                  FROM MOVIMIENTO M
                  JOIN CUENTA C ON M.cuenta = C.id
                  JOIN BANCO B ON C.banco = B.id
                  JOIN CATEGORIA T ON categoria = T.id
                  WHERE " . $condiciones . "
                  ORDER BY valor LIMIT " . round($perc * $limites['no'] / 100) . ",1";
        $result = $con->query($query);
        $valor = $result->fetch_assoc();
        $percentiles[$perc] = $valor['valor'];
      }
      $limites['perc'] = $percentiles;

      return array('status' => 200, 'limites' => $limites);
    }
  }

  protected function query() {

    $query = "TRUE";

    if (isset($this->request['account'])) {
      $query .= " AND C.id = " . $this->request['account'];
    }

    return $query;
  }

  protected function condiciones($filtros) {

    $query = "TRUE";

    if (isset($filtros->cuentas) && count($filtros->cuentas)) {
      $query .= " AND (FALSE";
      foreach ($filtros->cuentas as $cuenta) {
        $query .= (" OR C.id = " . $cuenta);
      }
      $query .= ")";
    }
    if (isset($filtros->categoria)) {
      $query .= " AND T.id = " . $filtros->categoria;
    }
    if (isset($filtros->fecha)) {
      if (isset($filtros->fecha->desde)) {
        $query .= " AND M.fecha >= '" . $filtros->fecha->desde . "'";
      }
      if (isset($filtros->fecha->hasta)) {
        $query .= " AND M.fecha <= '" . $filtros->fecha->hasta . "'";
      }
    }
    if (isset($filtros->importe)) {
      if (isset($filtros->importe->desde)) {
        $query .= " AND ABS(M.importe) >= " . $filtros->importe->desde;
      }
      if (isset($filtros->importe->hasta)) {
        $query .= " AND ABS(M.importe) <= " . $filtros->importe->hasta;
      }
      if (isset($filtros->importe->tipo)) {
        $query .= " AND M.importe " . ($filtros->importe->tipo == 'abonos' ? '>' : '<') . " 0";
      }
    }
    if (isset($filtros->concepto) && strlen($filtros->concepto) > 0) {
      $query .= " AND LOWER(M.descripcion) LIKE '%" . strtolower($filtros->concepto) . "%'";
    }

    return $query;
  }
}

$API = new bancaAPI($_REQUEST['request']);
echo $API->processAPI();
?>
