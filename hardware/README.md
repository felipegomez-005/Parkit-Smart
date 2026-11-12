# ESP32 de la maqueta

Abre [el sketch de dos plazas](ParkIt_Smart_2plazas/ParkIt_Smart_2plazas.ino) en Arduino IDE y súbelo a tu ESP32. Selecciona el modelo de tu placa y su puerto USB. El Monitor Serie funciona a 115200 baudios.

| Conexión | P1 | P2 |
| --- | --- | --- |
| FC-51 OUT | GPIO32 | GPIO33 |
| FC-51 VCC | 3V3 | 3V3 |
| FC-51 GND | GND | GND |
| LED bicolor de dos patas | GPIO25 ↔ GPIO26 | GPIO18 ↔ GPIO19 |

Usa una resistencia de 330 Ω en serie con cada LED. Si el LED se pone verde al acercar un objeto, desconecta el USB e intercambia sus patas. Al arrancar, el Monitor Serie debe mostrar dos plazas activas.
