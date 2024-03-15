#!/bin/bash

POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--stage)
      STAGE="$2"
      shift # past argument
      shift # past value
      ;;
    -c|--comment)
      COMMENT="$2"
      shift # past argument
      shift # past value
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done

set -- "${POSITIONAL_ARGS[@]}" # restore positional parameters

echo "Generating cert files for stage: ${STAGE}";

mkdir -p cert/${STAGE};
ssh-keygen -t rsa -b 4096 -m PEM -C ${COMMENT} -N '' -f ./cert/${STAGE}/id_rsa;
openssl rsa -in ./cert/${STAGE}/id_rsa -pubout -outform PEM -out ./cert/${STAGE}/id_rsa.pub;