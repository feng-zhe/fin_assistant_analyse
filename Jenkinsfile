node {
    stage "prerequisites"
    git url: "/home/git/projects/fin_assistant_analyse.git"
    def nodeHome = tool 'node-4.4.7'
    sh "${nodeHome}/bin/npm install"
    sh "${nodeHome}/bin/npm install -g node-gyp"

    stage "build"
    sh "node-gyp rebuild"

    stage "smoke-test"
    sh "${nodeHome}/bin/node analyse.js"

    stage "deploy"
    echo "TODO: this is the deploy phase, currently not needed because it is deployed locally"
}
