pipeline {
    agent any

    environment {
        // ----- Docker Hub -----
        IMAGE_NAME = 'eliehatoum/cicd-tasklist-frontend'
        IMAGE_TAG  = "${BUILD_NUMBER}"            // image tagged with the Jenkins build number
        IMAGE      = "${IMAGE_NAME}:${IMAGE_TAG}"

        // ----- SonarQube -----
        SONAR_HOST_URL  = 'https://sonarqube.cicd.kits.ext.educentre.fr'
        SONAR_PROJECT_KEY = 'elie-cicd-tasklist-frontend'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Prisma generate') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npm run test:coverage -- --outputFile.junit=reports/junit-unit.xml'
            }
        }

        stage('SonarQube analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-tasklist-frontend', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        sonar-scanner \
                          -Dsonar.host.url=$SONAR_HOST_URL \
                          -Dsonar.token=$SONAR_TOKEN \
                          -Dsonar.projectKey=$SONAR_PROJECT_KEY
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                withCredentials([string(credentialsId: 'sonar-tasklist-frontend', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        set -e

                        CE_TASK_URL=$(grep '^ceTaskUrl=' .scannerwork/report-task.txt | cut -d= -f2-)
                        echo "Polling Compute Engine task: $CE_TASK_URL"

                        # Wait for the background analysis to finish
                        STATUS="PENDING"
                        while [ "$STATUS" = "PENDING" ] || [ "$STATUS" = "IN_PROGRESS" ]; do
                            sleep 5
                            RESP=$(curl -s -u "$SONAR_TOKEN:" "$CE_TASK_URL")
                            STATUS=$(echo "$RESP" | jq -r '.task.status')
                            echo "Analysis status: $STATUS"
                        done

                        if [ "$STATUS" != "SUCCESS" ]; then
                            echo "SonarQube analysis did not succeed (status=$STATUS)"
                            exit 1
                        fi

                        ANALYSIS_ID=$(echo "$RESP" | jq -r '.task.analysisId')

                        GATE=$(curl -s -u "$SONAR_TOKEN:" \
                            "$SONAR_HOST_URL/api/qualitygates/project_status?analysisId=$ANALYSIS_ID" \
                            | jq -r '.projectStatus.status')

                        echo "Quality Gate status: $GATE"
                        if [ "$GATE" != "OK" ]; then
                            echo "Quality Gate failed -> blocking the pipeline"
                            exit 1
                        fi
                    '''
                }
            }
        }

        stage('Build Docker image') {
            steps {
                sh 'docker build -t $IMAGE -t $IMAGE_NAME:latest .'
            }
        }

        stage('Trivy security scan') {
            steps {
                sh '''
                    mkdir -p reports

                    # Human-readable + JSON reports (never fail here, just record findings)
                    trivy image --scanners vuln --severity HIGH,CRITICAL --ignorefile .trivyignore \
                        --format table --output reports/trivy-report.txt $IMAGE
                    trivy image --scanners vuln --severity HIGH,CRITICAL --ignorefile .trivyignore \
                        --format json  --output reports/trivy-report.json $IMAGE

                    # Gating scan: fail the build on HIGH/CRITICAL vulnerabilities
                    # (accepted, non-exploitable findings are listed in .trivyignore)
                    trivy image --scanners vuln --severity HIGH,CRITICAL --ignorefile .trivyignore \
                        --exit-code 1 --no-progress $IMAGE
                '''
            }
        }

        stage('Generate SBOM') {
            steps {
                sh '''
                    trivy image --format cyclonedx --output sbom-cyclonedx.json $IMAGE
                    trivy image --format spdx-json --output sbom-spdx.json $IMAGE
                '''
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'elie-dockerhub-password',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_PASS')]) {
                    sh '''
                        echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin
                        docker push $IMAGE
                        docker push $IMAGE_NAME:latest
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            // Publish test reports in Jenkins
            junit allowEmptyResults: true, testResults: 'reports/junit-*.xml'

            // Archive security reports + SBOM files
            archiveArtifacts artifacts: 'reports/trivy-report.*', allowEmptyArchive: true, fingerprint: true
            archiveArtifacts artifacts: 'sbom-*.json', allowEmptyArchive: true, fingerprint: true

            // remove the images built on the agent to save disk space
            sh 'docker rmi $IMAGE $IMAGE_NAME:latest || true'

            // Clean the Jenkins workspace
            cleanWs()
        }
    }
}
