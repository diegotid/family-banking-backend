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
      $result = $con->query("SELECT C.id id, logo, C.nombre name, C.tarjeta tarjeta, C.color color, descripcion, balance
                            FROM CUENTA C JOIN BANCO B ON C.banco = B.id ORDER BY id");
      while ($cuenta = $result->fetch_assoc()) {
        $cuenta['id'] = intval($cuenta['id']);
        if (!isset($cuenta['name'])) {
          $cuenta['name'] = $cuenta['descripcion'];
        }
        $cuenta['tarjeta'] = intval($cuenta['tarjeta']);
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
      if ($from > $through) $through = $from;
      $resultado = [];
      $resultado['lista'] = $movimientos;
      $resultado['resumen'] = [];
      $resultado['resumen']['total'] = round($total, 2);
      $resultado['resumen']['from'] = $from->format('Y-m-d');
      $resultado['resumen']['through'] = $through->format('Y-m-d');

      return array('status' => 200, 'summary' => $resultado['resumen'], 'transactions' => $movimientos);
    }
  }

  protected function query() {

    $query = "TRUE";

    if (isset($this->request['account'])) {
      $query .= " AND C.id = " . $this->request['account'];
    }

    return $query;
  }
}

$API = new bancaAPI($_REQUEST['request']);
echo $API->processAPI();
?>
