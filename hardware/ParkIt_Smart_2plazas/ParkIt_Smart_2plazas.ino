// ParkIt Smart - ESP32 - Preparado para 6 plazas
// Cada plaza tiene: 1 sensor FC-51 (entrada), 1 LED bicolor de dos patas (dos salidas).
//
// ==== MODO DE PRUEBA ====
// Cambia PLAZAS_ACTIVAS segun cuantas plazas tengas conectadas:
//   1 = solo la plaza 1 (prueba con un sensor y un par de LEDs)
//   2 = plazas 1 y 2
//   6 = prototipo completo
const int PLAZAS_ACTIVAS = 2;

// El FC-51 normalmente pone su salida en LOW cuando detecta un obstaculo.
// Si en tu prueba sale al reves, cambia esto a false.
const bool OCUPADO_ES_LOW = true;

const int TOTAL_PLAZAS = 6;

// Pines                      P1  P2  P3  P4  P5  P6
const int SENSORES[TOTAL_PLAZAS] = {32, 33, 27, 34, 35, 39};
const int LED_A[TOTAL_PLAZAS]   = {25, 18, 21, 23, 17, 13};
const int LED_B[TOTAL_PLAZAS]    = {26, 19, 22, 16,  4, 14};

// Ultimo estado conocido de cada plaza (-1 = aun sin leer)
int estadoAnterior[TOTAL_PLAZAS];

void actualizarPlaza(int i) {
  int lectura = digitalRead(SENSORES[i]);
  bool ocupada = OCUPADO_ES_LOW ? (lectura == LOW) : (lectura == HIGH);

  // El color cambia al invertir la polaridad entre las dos patas.
  digitalWrite(LED_A[i], ocupada ? LOW : HIGH);
  digitalWrite(LED_B[i],  ocupada ? HIGH : LOW);

  // Solo imprime cuando el estado cambia
  if ((int)ocupada != estadoAnterior[i]) {
    estadoAnterior[i] = (int)ocupada;
    Serial.print("Plaza ");
    Serial.print(i + 1);
    Serial.println(ocupada ? ": OCUPADA" : ": DISPONIBLE");
  }
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < PLAZAS_ACTIVAS; i++) {
    pinMode(SENSORES[i], INPUT);
    pinMode(LED_A[i], OUTPUT);
    pinMode(LED_B[i], OUTPUT);
    estadoAnterior[i] = -1;
  }

  Serial.println("=== ParkIt Smart - ESP32 ===");
  Serial.print(PLAZAS_ACTIVAS);
  Serial.println(" plaza(s) activa(s)");
}

void loop() {
  for (int i = 0; i < PLAZAS_ACTIVAS; i++) {
    actualizarPlaza(i);
  }
  delay(200);
}