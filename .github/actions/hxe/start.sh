docker compose -f ci.yml up -d;
docker exec hxe-hana-1 bash -c "until /check_hana_health -n -e ready-status > /dev/null; do sleep 1; done;"
