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

  protected function summary() {

    global $con;
    global $access_password;
    
    if ($this->method == 'GET') {
      
      if (!isset($this->token) || $this->token != md5($access_password)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
      $summary = [];
      $result = $con->query("SELECT MIN(fecha) start FROM MOVIMIENTO");
      $date = $result->fetch_assoc();
      $result->free();
      $summary['starting'] = $date['start'];

      $result = $con->query("SELECT MIN(importe) min, MAX(importe) max FROM MOVIMIENTO");
      $amount = $result->fetch_assoc();
      $result->free();
      $summary['amounts'] = array('min' => round(floatval($amount['min']), 2), 'max' => round(floatval($amount['max']), 2));

      return array('status' => 200, 'summary' => $summary);
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
      $result->free();

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
                LEFT JOIN CATEGORIA T ON categoria = T.id " . $this->perc() . "
                WHERE " . $this->query() . "
                ORDER BY fecha DESC LIMIT " . $offset . ", 20";

      $result = $con->query($query);
      if ($con->error) {
        $result->free();

        return array('status' => 500, 'error' => $con->error);
      }

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
      $result->free();

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

  protected function perc() {

    if (isset($this->request['month_perc'])) {
      $perc = $this->request['month_perc'];
      return "
        LEFT JOIN
        (SELECT YEAR(fecha) y, MONTH(fecha) m, MIN(importe) i FROM MOVIMIENTO
        GROUP BY YEAR(fecha), MONTH(fecha)
        ORDER BY YEAR(fecha), MONTH(fecha)) G
        ON YEAR(M.fecha) = G.y AND MONTH(M.fecha) = G.m
      ";
    } else {
      return "";
    }
  }

  protected function query() {

    $query = "TRUE";

    if (isset($this->request['account'])) {
      $accounts = explode(',', $this->request['account']);
      if (count($accounts) > 0) {
        $query .= " AND (FALSE";
        foreach ($accounts as $account) {
          $query .= " OR C.id = " . $account;
        }
        $query .= ")";
      }
    }

    if (isset($this->request['concept'])) {
      $concept = $this->request['concept'];
      $query .= " AND M.descripcion LIKE '%{$concept}%'";
    }

    if (isset($this->request['from'])) {
      $from = $this->request['from'];
      $query .= " AND M.fecha >= '{$from}'";
    }

    if (isset($this->request['until'])) {
      $until = $this->request['until'];
      $query .= " AND M.fecha <= '{$until}'";
    }

    if (isset($this->request['min'])) {
      $min = $this->request['min'];
      $query .= " AND M.importe >= '{$min}'";
    }

    if (isset($this->request['max'])) {
      $max = $this->request['max'];
      $query .= " AND M.importe <= '{$max}'";
    }

    if (isset($this->request['payroll'])) {
      $query .= " AND M.nomina IS TRUE";
    }

    if (isset($this->request['month_perc'])) {
      $perc = $this->request['month_perc'];
      $query .= " AND importe < G.i * " . $perc;
    }

    return $query;
  }
}

$API = new bancaAPI($_REQUEST['request']);
echo $API->processAPI();
?>
