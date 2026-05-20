pipeline {
    agent any

    environment {
        IMAGE_NAME      = 'jagriti'
        PROJECT_DIR     = '/opt/jagriti'
        COMPOSE_FILE    = '/opt/jagriti/docker-compose.yml'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo "Branch: ${env.BRANCH_NAME} | Commit: ${env.GIT_COMMIT[0..7]}"
            }
        }

        // ── Security Scans ──────────────────────────────────────────────
        stage('Security scans') {
            parallel {
                stage('Gitleaks') {
                    steps {
                        sh 'gitleaks detect --source . --report-format json --report-path gitleaks-report.json'
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'gitleaks-report.json', allowEmptyArchive: true
                        }
                    }
                }
                stage('Semgrep') {
                    steps {
                        sh 'semgrep scan --config auto --json --output semgrep-report.json .'
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'semgrep-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }

        // ── Dependency Audits ───────────────────────────────────────────
        stage('Dependency audit') {
            parallel {
                stage('npm audit') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            sh 'npm audit --audit-level=high'
                        }
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm audit --audit-level=high'
                        }
                    }
                }
                stage('pip-audit') {
                    steps {
                        dir('nlp-service') {
                            sh '''
                                pip install pip-audit --quiet
                                pip-audit -r requirements.txt --format json -o pip-audit-report.json
                            '''
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'nlp-service/pip-audit-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }

        // ── Tests ───────────────────────────────────────────────────────
        stage('Tests') {
            parallel {
                stage('Node.js unit tests') {
                    steps {
                        dir('backend') {
                            sh 'npm test'
                        }
                    }
                }
                stage('Python unit tests') {
                    steps {
                        dir('nlp-service') {
                            sh '''
                                pip install -r requirements.txt --quiet
                                pytest tests/ --junitxml=pytest-report.xml -v
                            '''
                        }
                    }
                    post {
                        always {
                            junit 'nlp-service/pytest-report.xml'
                        }
                    }
                }
            }
        }

        // ── Docker Builds ───────────────────────────────────────────────
        stage('Build Docker images') {
            steps {
                sh '''
                    docker compose -f ${COMPOSE_FILE} build \
                        --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
                        --build-arg GIT_COMMIT=${GIT_COMMIT}
                '''
            }
        }

        // ── Container Security ──────────────────────────────────────────
        stage('Trivy image scan') {
            steps {
                sh '''
                    trivy image --exit-code 1 --severity CRITICAL \
                        --format json --output trivy-report.json \
                        ${IMAGE_NAME}-backend
                    trivy image --exit-code 1 --severity CRITICAL \
                        ${IMAGE_NAME}-nlp-service
                    trivy image --exit-code 1 --severity CRITICAL \
                        ${IMAGE_NAME}-frontend
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        // ── Deploy (main branch only) ────────────────────────────────────
        // Jenkins IS on the server — no SSH needed, run directly
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    cd ${PROJECT_DIR}

                    # Pull latest code
                    git pull origin main

                    # Bring up containers (zero-downtime rolling restart)
                    docker compose -f ${COMPOSE_FILE} up -d --remove-orphans

                    # Clean up dangling images to save disk space
                    docker image prune -f

                    # Reload Nginx if config changed (no full restart = no downtime)
                    sudo nginx -t && sudo systemctl reload nginx

                    # Verify cloudflared tunnel is still running
                    sudo systemctl is-active cloudflared || sudo systemctl restart cloudflared
                '''
            }
        }
    }

    // ── Notifications ─────────────────────────────────────────────────────
    post {
        success {
            echo "✅ Build passed — ${env.BRANCH_NAME}@${env.GIT_COMMIT[0..7]}"
        }

        failure {
            echo "❌ Build failed — check archived scan reports"
        }

        always {
            cleanWs()
        }
    }
}