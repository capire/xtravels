docker cp ./A4H_Multiple.txt abap-abap-1:/opt/sap/ASABAP_license
docker exec -it abap-abap-1 /usr/local/bin/asabap_license_update
